import type { HealthResponse } from "@ancora/shared-types";
import { aiRuntimeBaseUrl } from "@/server/env";

export async function fetchAiRuntimeHealth(
  baseUrl: string = aiRuntimeBaseUrl,
): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl}/health`, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`AI runtime health check failed with ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
