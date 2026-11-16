import 'server-only';
import { requestCoachingSchema, retryCoachingSchema } from '@ancora/schemas';
import { db } from '@/server/db/client';
import { createCoachingClient } from '@/server/clients/practiceCoaching';
import { createPracticeRepository } from '@/server/programming-practice/repository';
import { readPracticeBody, respondPractice } from '@/server/programming-practice/http';
import { createCoachingRepository } from './repository';
import { createCoachingService } from './service';

const service = createCoachingService(
  createCoachingRepository(db),
  createPracticeRepository(db),
  createCoachingClient()
);

export function getCoaching(request: Request) {
  return respondPractice(request, () => {
    const attemptId = requestCoachingSchema.shape.attemptId.parse(
      new URL(request.url).searchParams.get('attemptId')
    );
    return service.status(attemptId);
  });
}

export function postCoaching(request: Request) {
  return respondPractice(request, async () => {
    const input = requestCoachingSchema.parse(await readPracticeBody(request));
    return service.start(input.id, input.attemptId);
  });
}

export function postCoachingRetry(
  request: Request,
  context: { params: Promise<{ coachingId: string }> }
) {
  return respondPractice(request, async () => {
    retryCoachingSchema.parse(await readPracticeBody(request));
    const id = requestCoachingSchema.shape.id.parse((await context.params).coachingId);
    return service.retry(id);
  });
}
