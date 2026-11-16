import {
  coachingOutputSchema,
  coachingStatusSchema,
  type CoachingError,
  type CoachingInput,
  type CoachingOutput,
} from '@ancora/schemas';
import { getPracticeServiceConfig } from '@/server/env';

export class CoachingCallError extends Error {
  constructor(public code: CoachingError) {
    super(code);
  }
}

export interface CoachingClient {
  status(): Promise<{ available: boolean; model: string | null }>;
  generate(input: CoachingInput): Promise<CoachingOutput>;
}

// Six bounded feedback fields need room for UTF-8 and JSON escaping.
const MAX_RESPONSE_BYTES = 40_000;

async function readCoachingResponse(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new CoachingCallError('provider_interrupted');
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      length += next.value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new CoachingCallError('coaching_invalid');
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
}

export function createCoachingClient(fetcher: typeof fetch = fetch): CoachingClient {
  const config = getPracticeServiceConfig();
  const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
  return {
    async status() {
      if (config.token.length < 32) {
        return { available: false, model: null };
      }
      try {
        const response = await fetcher(`${config.url}/v1/coaching/status`, {
          headers,
          cache: 'no-store',
          signal: AbortSignal.timeout(2_000),
        });
        const parsed = coachingStatusSchema
          .pick({ available: true, model: true })
          .safeParse(await readCoachingResponse(response));
        return response.ok && parsed.success ? parsed.data : { available: false, model: null };
      } catch {
        return { available: false, model: null };
      }
    },
    async generate(input) {
      if (config.token.length < 32) {
        throw new CoachingCallError('coaching_unavailable');
      }
      try {
        const response = await fetcher(`${config.url}/v1/coaching`, {
          method: 'POST',
          headers,
          body: JSON.stringify(input),
          cache: 'no-store',
          signal: AbortSignal.timeout(75_000),
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw new CoachingCallError(
            response.status === 422
              ? 'coaching_invalid'
              : response.status === 503
                ? 'coaching_unavailable'
                : 'provider_interrupted'
          );
        }
        const parsed = coachingOutputSchema.safeParse(await readCoachingResponse(response));
        if (!parsed.success) {
          throw new CoachingCallError('coaching_invalid');
        }
        return parsed.data;
      } catch (error) {
        if (error instanceof CoachingCallError) {
          throw error;
        }
        // Network/provider exceptions can contain credentials or prompts. Retain only a safe code.
        throw new CoachingCallError('provider_interrupted');
      }
    },
  };
}
