import {
  hintOutputSchema,
  hintsSchema,
  type HintError,
  type HintInput,
  type HintOutput,
} from '@ancora/schemas';
import { getPracticeServiceConfig } from '@/server/env';

export class HintCallError extends Error {
  constructor(public code: HintError) {
    super(code);
  }
}

export interface HintClient {
  status(): Promise<{ available: boolean; model: string | null }>;
  generate(input: HintInput): Promise<HintOutput>;
}

async function readHintResponse(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new HintCallError('provider_interrupted');
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
      if (length > 16_000) {
        await reader.cancel();
        throw new HintCallError('hint_invalid');
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

export function createHintClient(fetcher: typeof fetch = fetch): HintClient {
  const config = getPracticeServiceConfig();
  const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
  return {
    async status() {
      if (config.token.length < 32) {
        return { available: false, model: null };
      }
      try {
        const response = await fetcher(`${config.url}/v1/hints/status`, {
          headers,
          cache: 'no-store',
          signal: AbortSignal.timeout(2_000),
        });
        const parsed = hintsSchema
          .pick({ available: true, model: true })
          .safeParse(await readHintResponse(response));
        return response.ok && parsed.success ? parsed.data : { available: false, model: null };
      } catch {
        return { available: false, model: null };
      }
    },
    async generate(input) {
      if (config.token.length < 32) {
        throw new HintCallError('hints_unavailable');
      }
      try {
        const response = await fetcher(`${config.url}/v1/hints`, {
          method: 'POST',
          headers,
          body: JSON.stringify(input),
          cache: 'no-store',
          signal: AbortSignal.timeout(75_000),
        });
        if (!response.ok) {
          await response.body?.cancel();
          throw new HintCallError(
            response.status === 422
              ? 'hint_invalid'
              : response.status === 503
                ? 'hints_unavailable'
                : 'provider_interrupted'
          );
        }
        const parsed = hintOutputSchema.safeParse(await readHintResponse(response));
        if (!parsed.success) {
          throw new HintCallError('hint_invalid');
        }
        return parsed.data;
      } catch (error) {
        if (error instanceof HintCallError) {
          throw error;
        }
        // Network/provider exceptions can contain credentials or prompts. Retain only a safe code.
        throw new HintCallError('provider_interrupted');
      }
    },
  };
}
