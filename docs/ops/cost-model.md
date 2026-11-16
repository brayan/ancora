# Cost Model

Fixed practice and browser execution do not call an LLM. Challenge generation, hints and explicitly requested coaching may dispatch paid requests when configured. CI uses synthetic providers with no provider credentials or paid calls.

Generation permits one initial dispatch and at most one explicit correction. Hint/coaching requests have their own initial-plus-one-explicit-retry allowance. Framework/SDK/transport retries cannot expand durable allowances. Uncertain dispatches consume allowance; reads/reloads and runner messages cannot trigger a paid retry.

Live evaluation requires a separately selected model and explicit total budget before calls. Record observed usage, versions and dispatch outcomes using synthetic inputs; verify current prices before calculating costs. Missing usage/cost remains unknown. Earlier generation/hint budgets were separate completed authorizations, not standing credit.

Live coaching evaluation is deferred for v1 completion; no earlier budget is reused. See [eval strategy](../evals/eval-strategy.md) and [coaching limits](../architecture/selected-attempt-coaching.md).
