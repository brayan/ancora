import { generatorOutputSchema, type GeneratorInput, type GeneratorOutput } from '@ancora/schemas';
import { getPracticeServiceConfig } from '@/server/env';

export class GeneratorCallError extends Error {
  constructor(public code: 'draft_invalid' | 'provider_interrupted' | 'generation_unavailable') {
    super(code);
  }
}

export interface GeneratorClient {
  status(): Promise<{ available: boolean; model: string | null }>;
  generate(input: GeneratorInput): Promise<GeneratorOutput>;
}

async function readBounded(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new GeneratorCallError('provider_interrupted');
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) {
        break;
      }
      length += item.value.byteLength;
      if (length > 100_000) {
        await reader.cancel();
        throw new GeneratorCallError('draft_invalid');
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) as unknown;
}

export function createGeneratorClient(): GeneratorClient {
  const config = getPracticeServiceConfig();
  const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
  return {
    async status() {
      if (config.token.length < 32) {
        return { available: false, model: null };
      }
      try {
        const response = await fetch(`${config.url}/v1/status`, {
          headers,
          cache: 'no-store',
          signal: AbortSignal.timeout(2_000),
        });
        const value = await readBounded(response);
        if (
          !response.ok ||
          !value ||
          typeof value !== 'object' ||
          !('available' in value) ||
          !('model' in value) ||
          typeof value.available !== 'boolean' ||
          !(value.model === null || (typeof value.model === 'string' && value.model.length <= 100))
        ) {
          return { available: false, model: null };
        }
        return { available: value.available, model: value.model };
      } catch {
        return { available: false, model: null };
      }
    },
    async generate(input) {
      if (config.token.length < 32) {
        throw new GeneratorCallError('generation_unavailable');
      }
      try {
        const response = await fetch(`${config.url}/v1/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify(input),
          cache: 'no-store',
          signal: AbortSignal.timeout(75_000),
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw new GeneratorCallError(
            response.status === 422
              ? 'draft_invalid'
              : response.status === 503
                ? 'generation_unavailable'
                : 'provider_interrupted'
          );
        }
        const output = generatorOutputSchema.safeParse(await readBounded(response));
        if (!output.success) {
          throw new GeneratorCallError('draft_invalid');
        }
        return output.data;
      } catch (error) {
        if (error instanceof GeneratorCallError) {
          throw error;
        }
        // Provider/network errors can contain source or credentials; retain only a stable outcome.
        throw new GeneratorCallError('provider_interrupted');
      }
    },
  };
}
