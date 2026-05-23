export type SmokeResult = Readonly<{
  checks: readonly string[];
  dataset: "synthetic-empty";
  status: "ok";
  suite: "smoke";
}>;

export function runSmoke(): SmokeResult {
  return {
    checks: [],
    dataset: "synthetic-empty",
    status: "ok",
    suite: "smoke",
  };
}
