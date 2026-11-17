import 'server-only';
import {
  completeAttemptSchema,
  referenceSchema,
  saveDraftSchema,
  submitAttemptSchema,
} from '@ancora/schemas';
import { db } from '@/server/db/client';
import { createPracticeRepository, PracticeError } from '@/server/programming-practice/repository';
import { createPracticeService } from '@/server/programming-practice/service';

const service = createPracticeService(createPracticeRepository(db));
const APP_ORIGIN = 'http://127.0.0.1:3000';
const MAX_BODY_BYTES = 100_000;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

export async function readPracticeBody(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new PracticeError('json_required', 415);
  }
  const reader = request.body?.getReader();
  if (!reader) {
    throw new PracticeError('invalid_request');
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      size += next.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new PracticeError('request_too_large', 413);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new PracticeError('invalid_json');
  }
}

export async function respondPractice(request: Request, action: () => Promise<unknown>) {
  try {
    if (request.headers.get('host') !== '127.0.0.1:3000') {
      throw new PracticeError('local_host_required', 403);
    }
    const origin = request.headers.get('origin');
    if ((origin && origin !== APP_ORIGIN) || (request.method !== 'GET' && origin !== APP_ORIGIN)) {
      throw new PracticeError('application_origin_required', 403);
    }
    const result = await action();
    return result instanceof Response ? result : Response.json(result, { headers });
  } catch (error) {
    if (error instanceof PracticeError) {
      return Response.json({ error: error.code }, { status: error.status, headers });
    }
    // Database/validation exceptions may carry submitted source. Never serialize or log them.
    const invalid = error !== null && typeof error === 'object' && 'issues' in error;
    return Response.json(
      { error: invalid ? 'invalid_request' : 'practice_unavailable' },
      { status: invalid ? 400 : 503, headers }
    );
  }
}

export function getSession(request: Request) {
  return respondPractice(request, () => {
    const value = new URL(request.url).searchParams.get('revisionId');
    const revisionId = value === null ? undefined : referenceSchema.shape.revisionId.parse(value);
    return service.session(revisionId);
  });
}

export function postSession(request: Request) {
  return respondPractice(request, async () => {
    const input = referenceSchema.parse(await readPracticeBody(request));
    return service.select(input.revisionId);
  });
}

export function putDraft(request: Request) {
  return respondPractice(request, async () => {
    const input = saveDraftSchema.parse(await readPracticeBody(request));
    try {
      return await service.saveDraft(input.revisionId, input.source, input.version);
    } catch (error) {
      if (error instanceof PracticeError && error.code === 'draft_conflict') {
        return Response.json(
          { error: 'draft_conflict', draft: await service.draft(input.revisionId) },
          { status: 409, headers }
        );
      }
      throw error;
    }
  });
}

export function postAttempt(request: Request) {
  return respondPractice(request, async () =>
    service.submit(submitAttemptSchema.parse(await readPracticeBody(request)))
  );
}

export function postReport(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  return respondPractice(request, async () => {
    const { attemptId } = await context.params;
    const input = completeAttemptSchema.parse(await readPracticeBody(request));
    await service.complete(attemptId, input.report);
    return { apiVersion: 1, saved: true };
  });
}

export function getAttempt(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  return respondPractice(request, async () =>
    service.viewAttempt((await context.params).attemptId)
  );
}

export function postReference(request: Request) {
  return respondPractice(request, async () => {
    const input = referenceSchema.parse(await readPracticeBody(request));
    return service.reference(input.revisionId);
  });
}
