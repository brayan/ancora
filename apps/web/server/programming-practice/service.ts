import { createHash, randomUUID } from 'node:crypto';
import { challengeSchema, sessionSchema } from '@ancora/schemas';
import type { Submission } from '@ancora/shared-types';
import { FIXED_REVISION } from '@/server/programming-practice/fixture';
import { PracticeError, type PracticeRepository } from '@/server/programming-practice/repository';
import { matchesJob, parseRunnerResponse, resultsMatchCases } from '@/runner/protocol.mjs';
import type { RunRequest } from '@/runner/protocol.mjs';
import type { RevisionContent } from '@/server/db/schema';

function runRequest(
  content: RevisionContent,
  source: string,
  mode: 'examples' | 'check',
  jobId: string
): RunRequest {
  const cases = mode === 'examples' ? content.publicCases : content.checkCases;
  return {
    type: 'run',
    protocolVersion: 1,
    jobId,
    revisionId: content.revisionId,
    sourceDigest: createHash('sha256').update(source).digest('hex'),
    casesDigest: createHash('sha256').update(JSON.stringify(cases)).digest('hex'),
    runtimeVersion: content.runtimeVersion,
    source,
    cases,
    functionName: 'positive_even',
    technique: 'list_comprehension',
  };
}

export function createPracticeService(repository: PracticeRepository) {
  async function session() {
    const revision = await repository.initialize();
    const draft = await repository.draft(revision.id);
    const attempts = await repository.recent(revision.id);
    const latest = attempts[0];
    const view = challengeSchema.strip().parse(revision.content);
    return sessionSchema.parse({
      apiVersion: 1,
      challenge: challengeSchema.parse(view),
      draft,
      attempts: attempts.map((item) => ({
        id: item.id,
        revisionId: item.revisionId,
        mode: item.mode,
        createdAt: item.createdAt.toISOString(),
        completed: item.report !== null,
      })),
      latestAttempt: latest
        ? {
            id: latest.id,
            revisionId: latest.revisionId,
            source: latest.source,
            mode: latest.mode,
            createdAt: latest.createdAt.toISOString(),
            report: latest.report,
          }
        : null,
    });
  }

  async function submit(input: Submission) {
    const revision = await repository.revision(input.revisionId);
    const request = runRequest(revision.content, input.source, input.mode, input.submissionId);
    const saved = await repository.submit({
      id: input.submissionId,
      revisionId: input.revisionId,
      source: input.source,
      mode: input.mode,
      sourceDigest: request.sourceDigest,
      casesDigest: request.casesDigest,
      runtimeVersion: request.runtimeVersion,
    });
    return { apiVersion: 1, attemptId: saved.id, request, report: saved.report };
  }

  async function complete(id: string, value: unknown) {
    const attempt = await repository.attempt(id);
    const revision = await repository.revision(attempt.revisionId);
    const request = runRequest(revision.content, attempt.source, attempt.mode, attempt.id);
    const report = parseRunnerResponse(value);
    if (!report || !matchesJob(report, request) || !resultsMatchCases(report, request)) {
      throw new PracticeError('invalid_report');
    }
    await repository.complete(id, report);
  }

  async function reference(revisionId: string) {
    const revision = await repository.revision(revisionId);
    return {
      apiVersion: 1,
      attemptId: null,
      report: null,
      request: runRequest(
        revision.content,
        revision.content.referenceSource,
        'check',
        randomUUID()
      ),
    };
  }

  async function viewAttempt(id: string) {
    const saved = await repository.attempt(id);
    return {
      id: saved.id,
      revisionId: saved.revisionId,
      source: saved.source,
      mode: saved.mode,
      createdAt: saved.createdAt.toISOString(),
      report: saved.report,
    };
  }

  return {
    session,
    submit,
    complete,
    reference,
    viewAttempt,
    saveDraft: repository.saveDraft,
    draft: repository.draft,
  };
}

export const FIXED_REVISION_ID = FIXED_REVISION.revisionId;
