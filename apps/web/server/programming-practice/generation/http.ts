import 'server-only';
import {
  correctionRequestSchema,
  generationValidationSchema,
  startGenerationSchema,
} from '@ancora/schemas';
import { db } from '@/server/db/client';
import { createGeneratorClient } from '@/server/clients/practiceGenerator';
import { createPracticeRepository } from '@/server/programming-practice/repository';
import { readPracticeBody, respondPractice } from '@/server/programming-practice/http';
import { createGenerationRepository } from './repository';
import { createGenerationService } from './service';

const service = createGenerationService(
  createGenerationRepository(db),
  createPracticeRepository(db),
  createGeneratorClient()
);
type Context = { params: Promise<{ generationId: string }> };
const id = async (context: Context) =>
  startGenerationSchema.shape.id.parse((await context.params).generationId);

export function getGenerations(request: Request) {
  return respondPractice(request, () => service.status());
}

export function postGeneration(request: Request) {
  return respondPractice(request, async () => {
    const input = startGenerationSchema.parse(await readPracticeBody(request));
    return service.start(input.id, input.request);
  });
}

export function getGeneration(request: Request, context: Context) {
  return respondPractice(request, async () => service.get(await id(context)));
}

export function postCorrection(request: Request, context: Context) {
  return respondPractice(request, async () => {
    correctionRequestSchema.parse(await readPracticeBody(request));
    return service.correct(await id(context));
  });
}

export function getValidation(request: Request, context: Context) {
  return respondPractice(request, async () => service.validation(await id(context)));
}

export function postValidation(request: Request, context: Context) {
  return respondPractice(request, async () => {
    const input = generationValidationSchema.parse(await readPracticeBody(request));
    return service.complete(await id(context), input.revisionId, input.report);
  });
}
