import 'server-only';
import { referenceSchema, requestHintSchema, retryHintSchema } from '@ancora/schemas';
import { db } from '@/server/db/client';
import { createHintClient } from '@/server/clients/practiceHints';
import { createPracticeRepository } from '@/server/programming-practice/repository';
import { readPracticeBody, respondPractice } from '@/server/programming-practice/http';
import { createHintRepository } from './repository';
import { createHintService } from './service';

const service = createHintService(
  createHintRepository(db),
  createPracticeRepository(db),
  createHintClient()
);

export function getHints(request: Request) {
  return respondPractice(request, () => {
    const revisionId = referenceSchema.shape.revisionId.parse(
      new URL(request.url).searchParams.get('revisionId')
    );
    return service.status(revisionId);
  });
}

export function postHint(request: Request) {
  return respondPractice(request, async () => {
    const input = requestHintSchema.parse(await readPracticeBody(request));
    return service.start(input.id, input.revisionId, input.level);
  });
}

export function postHintRetry(request: Request, context: { params: Promise<{ hintId: string }> }) {
  return respondPractice(request, async () => {
    retryHintSchema.parse(await readPracticeBody(request));
    const id = requestHintSchema.shape.id.parse((await context.params).hintId);
    return service.retry(id);
  });
}
