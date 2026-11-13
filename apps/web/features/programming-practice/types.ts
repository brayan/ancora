import type { RunnerResponse } from "@/runner/protocol.mjs";

export type RunnerState = Readonly<{
  status:
    | "connecting"
    | "ready"
    | "preparing"
    | "loading"
    | "running"
    | "finished"
    | "unavailable";
  response: RunnerResponse | null;
  label: string;
}>;
