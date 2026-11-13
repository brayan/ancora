# Failure Cases

| Failure | Required behavior |
|---|---|
| Worker bootstrap unavailable | Explain local runner setup; allow retry. |
| Infinite loop / Stop | Terminate the worker; a new run gets a fresh runtime. |
| Excessive output / oversized messages | Bound output/data and reject malformed results. |
| Syntax/runtime error | Bounded local error; preserve editor text. |
| Wrong or mutated result | Behavioral failure, separate from technique. |
| Unsupported technique pattern | Inconclusive, not an invented pass. |
| Stale job/revision/digest | Reject without changing current results. |
| Runner network/privileged request | Block through execution-origin policy; never dispatch application actions. |
| Browser OOM | Hard process quota unavailable; document risk and manual reload recovery. |
| Future provider timeout | Durable interrupted/unknown state, no silent paid retry. |

See ADR 0011, runner-spike.md and the browser tests. Inputs/screenshots are synthetic.
