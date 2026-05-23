import { localPorts } from "@ancora/config";

export const aiRuntimeBaseUrl =
  process.env.AI_RUNTIME_BASE_URL ??
  process.env.NEXT_PUBLIC_AI_RUNTIME_BASE_URL ??
  `http://localhost:${localPorts.aiRuntime}`;
