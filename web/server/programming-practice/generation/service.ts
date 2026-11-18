import {
  generatorOutputSchema,
  generationViewSchema,
  parseGeneratedCases,
  type GenerationRequest,
  type GeneratorOutput,
} from '@ancora/schemas';
import { sameCaseValue } from '../reports';
import type { RevisionContent } from '@/server/db/schema';
import type { PracticeRepository } from '@/server/programming-practice/repository';
import { PracticeError } from '@/server/programming-practice/repository';
import { buildRunRequest } from '@/server/programming-practice/service';
import {
  RUNTIME_VERSION,
  matchesJob,
  parseRunnerResponse,
  resultsMatchCases,
} from '@/runner/protocol.mjs';
import type { GenerationRepository } from './repository';
import { GeneratorCallError, type GeneratorClient } from '@/server/clients/practiceGenerator';

function candidateContent(id: string, dispatch: number, output: GeneratorOutput): RevisionContent {
  const draft = output.draft;
  const cases = parseGeneratedCases(draft);
  const contract = draft.functionContract;
  const revisionId = `${id}@${dispatch}`;
  return {
    revisionId,
    title: draft.title,
    objective: draft.objective,
    statement: draft.statement,
    signature: `${contract.name}(${contract.parameter.name}: ${contract.parameter.type}) → ${contract.returns}`,
    starterCode: `def ${contract.name}(${contract.parameter.name}: ${contract.parameter.type}) -> ${contract.returns}:\n    pass\n`,
    requirements: [...draft.requirements, ...draft.constraints],
    functionContract: contract,
    technique: draft.technique,
    concept: draft.concept,
    difficulty: draft.difficulty,
    publicCases: cases.publicCases,
    checkCases: cases.checkCases,
    referenceSource: draft.referenceSource,
    runtimeVersion: RUNTIME_VERSION,
    validatorVersion: 'generated-contract@1',
    generationMetadata: {
      generationId: id,
      dispatch,
      model: output.model,
      expectedOrigin: 'model_proposed',
    },
    generationDraft: draft,
  };
}

export function createGenerationService(
  repository: GenerationRepository,
  practice: PracticeRepository,
  generator: GeneratorClient,
  now: () => number = Date.now
) {
  type Generation = Awaited<ReturnType<GenerationRepository['get']>>;

  async function current(id: string) {
    const row = await repository.get(id);
    if (row.state === 'generating' && now() - row.updatedAt.getTime() > 120_000) {
      await repository.fail(id, row.dispatches, 'provider_interrupted', true);
      return repository.get(id);
    }
    return row;
  }

  async function view(row: Generation) {
    const title =
      row.state === 'ready' && row.revisionId
        ? (await practice.revision(row.revisionId)).content.title
        : null;
    return generationViewSchema.parse({
      id: row.id,
      state: row.state,
      dispatches: row.dispatches,
      revisionId: row.revisionId,
      title,
      error: row.error,
      model: row.model,
    });
  }

  async function dispatch(row: Generation) {
    let phase: 'provider' | 'candidate' | 'persistence' = 'provider';
    try {
      const previous = row.revisionId
        ? ((await practice.revision(row.revisionId)).content.generationDraft ?? null)
        : null;
      const generated = await generator.generate({
        schemaVersion: 1,
        request: row.request,
        previous,
        feedback:
          row.dispatches > 1
            ? [
                previous
                  ? 'reference_failed'
                  : ([...row.events].reverse().find((item) => item.error)?.error ??
                    'draft_invalid'),
              ]
            : [],
        recentExercises: (await practice.readyChallenges()).slice(0, 5).map((item) => item.title),
      });
      phase = 'candidate';
      const output = generatorOutputSchema.parse(generated);
      if (
        output.draft.concept !== row.request.concept ||
        output.draft.difficulty !== row.request.difficulty
      ) {
        throw new GeneratorCallError('draft_invalid');
      }

      const content = candidateContent(row.id, row.dispatches, output);
      // Validate the complete bounded runner envelope before recording an executable candidate.
      buildRunRequest(content, content.referenceSource, 'check', row.id);
      phase = 'persistence';
      await repository.saveCandidate(row.id, row.dispatches, content);
    } catch (error) {
      const invalid =
        error instanceof GeneratorCallError
          ? error.code === 'draft_invalid'
          : phase === 'candidate';
      const code = invalid
        ? 'draft_invalid'
        : error instanceof GeneratorCallError
          ? error.code
          : 'provider_interrupted';
      await repository.fail(row.id, row.dispatches, code, !invalid);
    }
    return view(await repository.get(row.id));
  }

  async function start(id: string, request: GenerationRequest) {
    const started = await repository.start(id, request);
    return started.created ? dispatch(started.row) : view(await current(id));
  }

  async function correct(id: string) {
    return dispatch(await repository.correct(id));
  }

  async function validation(id: string) {
    const generation = await current(id);
    if (!generation.revisionId || generation.state === 'generating') {
      throw new PracticeError('validation_not_available', 409);
    }
    const saved = await repository.candidate(generation.revisionId);
    const revision = await practice.revision(saved.revisionId);
    return {
      apiVersion: 1 as const,
      attemptId: null,
      report: saved.report,
      request: buildRunRequest(
        revision.content,
        revision.content.referenceSource,
        'check',
        saved.jobId
      ),
    };
  }

  async function complete(id: string, revisionId: string, value: unknown) {
    const generation = await current(id);
    if (generation.revisionId !== revisionId) {
      throw new PracticeError('validation_stale', 409);
    }
    const envelope = await validation(id);
    const report = parseRunnerResponse(value);
    if (
      !report ||
      !matchesJob(report, envelope.request) ||
      !resultsMatchCases(report, envelope.request)
    ) {
      throw new PracticeError('invalid_report');
    }
    if (
      report.type === 'failure' &&
      ['stopped', 'bootstrap_error', 'execution_error', 'invalid_message'].includes(report.code)
    ) {
      await repository.interruptedValidation(id, revisionId, generation.dispatches);
      return view(await repository.get(id));
    }

    const approved =
      report.type === 'result' &&
      report.error === null &&
      report.cases.every(
        (item, index) =>
          item.passed &&
          !item.mutated &&
          sameCaseValue(item.actual, envelope.request.cases[index].expected)
      ) &&
      report.technique === (envelope.request.technique === 'none' ? 'not_required' : 'passed');
    await repository.complete(id, revisionId, report, approved);
    return view(await repository.get(id));
  }

  async function latest() {
    const row = await repository.latest();
    return row ? view(await current(row.id)) : null;
  }

  return {
    start,
    correct,
    validation,
    complete,
    latest,
    get: async (id: string) => view(await current(id)),
    status: async () => ({ ...(await generator.status()), generation: await latest() }),
  };
}
