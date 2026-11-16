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
| Provider timeout or lost response | Durable interrupted/unknown state, no silent paid retry; explicit correction/retry uses remaining allowance. |
| Draft save failure or concurrent-tab conflict | Preserve editor/recovery copies; require an explicit conflict choice. |
| Generation validation interrupted | Reopen the saved candidate and resume validation; never silently regenerate it. |
| Hint/coaching unavailable | Keep saved assistance readable; do not dispatch on reads or reload. |
| Coaching sharing cancelled | Send no source/provider request; preserve the selected attempt and editor. |
| Unknown/incomplete migration ledger | Refuse migration and require historical review; never reset or infer missing steps. |

See [runner limits](../architecture/runner-spike.md), [persistence](../architecture/practice-persistence.md), [coaching](../architecture/selected-attempt-coaching.md) and [v1 verification](../testing/v1-completion.md). Inputs/screenshots are synthetic.
