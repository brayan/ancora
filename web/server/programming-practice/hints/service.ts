import { hintInputSchema, hintOutputSchema, hintsSchema, hintViewSchema } from '@ancora/schemas';
import type { HintRepository } from './repository';
import { HintCallError, type HintClient } from '@/server/clients/practiceHints';
import type { PracticeRepository } from '@/server/programming-practice/repository';

export function createHintService(
  repository: HintRepository,
  practice: PracticeRepository,
  provider: HintClient,
  now: () => number = Date.now
) {
  type HintRow = Awaited<ReturnType<HintRepository['get']>>;
  const view = (row: HintRow) =>
    hintViewSchema.parse({
      id: row.id,
      revisionId: row.revisionId,
      level: row.level,
      state: row.state,
      dispatches: row.dispatches,
      content: row.output?.hint.content ?? null,
      model: row.output?.model ?? null,
      error: row.error,
    });

  async function current(id: string) {
    const row = await repository.get(id);
    if (row.state === 'generating' && now() - row.updatedAt.getTime() > 120_000) {
      await repository.finish(id, row.dispatches, null, 'provider_interrupted');
      return repository.get(id);
    }
    return row;
  }

  async function dispatch(row: HintRow) {
    let phase: 'provider' | 'validation' | 'persistence' = 'provider';
    try {
      const revision = await practice.usableRevision(row.revisionId);
      const content = revision.content;
      const previous = (await repository.list(row.revisionId)).filter(
        (hint) => hint.level < row.level && hint.state === 'ready'
      );
      const input = hintInputSchema.parse({
        schemaVersion: 1,
        level: row.level,
        challenge: {
          title: content.title,
          objective: content.objective,
          statement: content.statement,
          requirements: content.requirements,
          publicCases: content.publicCases,
          functionContract: content.functionContract ?? {
            name: 'positive_even',
            parameter: { name: 'values', type: 'list[int]' },
            returns: 'list[int]',
          },
          technique: content.technique ?? 'list_comprehension',
        },
        previousHints: previous.map((hint) => hint.output!.hint.content),
      });
      const generated = await provider.generate(input);
      phase = 'validation';
      const output = hintOutputSchema.parse(generated);
      if (
        output.hint.level !== row.level ||
        previous.some((hint) => hint.output?.hint.content.trim() === output.hint.content.trim()) ||
        /```|\b(?:async\s+)?def\s+\w+\s*\(/.test(output.hint.content)
      ) {
        throw new HintCallError('hint_invalid');
      }
      phase = 'persistence';
      await repository.finish(row.id, row.dispatches, output, null);
    } catch (error) {
      const code =
        error instanceof HintCallError
          ? error.code
          : phase === 'validation'
            ? 'hint_invalid'
            : 'provider_interrupted';
      await repository.finish(row.id, row.dispatches, null, code);
    }
    return view(await repository.get(row.id));
  }

  async function start(id: string, revisionId: string, level: number) {
    await practice.usableRevision(revisionId);
    const started = await repository.start(id, revisionId, level);
    return started.claimed ? dispatch(started.row) : view(await current(started.row.id));
  }

  async function retry(id: string) {
    const original = await current(id);
    await practice.usableRevision(original.revisionId);
    const retried = await repository.retry(id);
    return retried.claimed ? dispatch(retried.row) : view(await current(id));
  }

  async function status(revisionId: string) {
    await practice.usableRevision(revisionId);
    const rows = await repository.list(revisionId);
    const hints = [];
    for (const row of rows) {
      hints.push(view(await current(row.id)));
    }
    return hintsSchema.parse({ apiVersion: 1, ...(await provider.status()), hints });
  }

  return { start, retry, status };
}
