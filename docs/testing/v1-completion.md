# Local V1 Completion

The owner authorized this completion pass from merged `main` (`bf8634f`, PR #12). The local loop includes generated challenges, isolated Python execution, immutable revisions, saved drafts/attempts, recent history, reveal, progressive hints and selected-attempt coaching. ADRs 0011–0016 remain authoritative. This is local software verification, not a public-deployment or model-quality approval.

Verified on 2026-11-16 UTC in a fresh macOS arm64 worktree with Node 26.0.0, pnpm 10.8.0, Python 3.13.13, uv 0.11.18 and Google Chrome 157.0.8103.79. Local Node satisfies the supported 22+ range; CI's exact Node 22/Linux environment was not reproduced here.

## Reproduction and evidence

Use [README setup](../../README.md#local-startup) and [the CI entrypoints](../engineering/continuous-integration.md). Install frozen pnpm/uv workspaces and have `pgvector/pgvector:pg16` plus Google Chrome available. Stop manual previews before browser checks; they require loopback ports 3000, 3001 and 8001.

All database verification in this pass uses new containers, tmpfs storage and random loopback ports. Existing databases/volumes are never targeted. The migration journal has ten retained entries: 0000–0004 and 0006–0010. Reserved legacy 0005 is recognized only by its known fingerprint and test fixture; no replacement migration or destructive schema diff is generated.

| Check | Result |
|---|---|
| Fresh frozen pnpm/uv installs | Passed; lockfiles unchanged. |
| `pnpm repo:test:pr` | Passed: conventions/contracts/types, 16 quality fixtures, 33 web unit tests, 48 disposable-PostgreSQL cases and eval scaffold checks. |
| `pnpm python:check` | Passed: Ruff/layout/strict Pyright/Tach and 233 offline tests, including 21 architecture cases. |
| `pnpm db:migrate` twice, then `pnpm --filter @ancora/web build` | Passed against a fresh disposable database; exactly ten ledger rows after both migrations. |
| `pnpm web:test:browser` | All 53 tests passed in installed Google Chrome, with zero retries (3.7 minutes). |
| Ordinary `pnpm dev` and manual Chrome workflow | All three services started; synthetic draft saved, 6/6 cases passed and saved draft/attempt resumed after reload with providers disabled. |

The database suite includes fresh and known-legacy histories, upgrades from 0006/0007/0008/0009 through 0010, retained drafts/attempts/assistance, idempotency, unknown/incomplete-ledger refusal and immutable records. Upgrade fixtures now seed actual reveal and accepted hint records where the historical schema supports them; after repeated migration they retain exact records and nonzero attempt assistance snapshots. Historical attempts default to no coaching. The test wrapper always replaces any supplied database URL with its own disposable connection.

The Next.js production build requires an explicit `DATABASE_URL`, even while collecting route data. An initial build without it correctly refused configuration; the setup check supplies only a fresh disposable database. This does not authorize production hosting.

## Corrections and review

Current docs now describe the implemented capabilities and separate historical slice measurements from current evidence. The eval strategy covers programming practice rather than retired source/RAG/card behavior. Setup names all three services, frozen tools, the required test image and explicit migration ownership.

Validation launchers preserve `PYTHONDONTWRITEBYTECODE` for local startup and force it for the synthetic Python test service. Shared Python checks retain their existing layout and import guards. No runtime dependency, API contract, prompt, migration or historical SQL/snapshot is changed by this completion pass.

The full Chrome suite covers generation/correction, hints, reveal and explicitly shared coaching, save/conflict/lost-response recovery, reload, Stop/timeout/output/reset and blocked runner network/action requests. Automated normal-flow console/network assertions passed; failure cases inject their own expected errors. Desktop 1280×720 and mobile 390×844 synthetic captures were inspected. Manual Chrome additionally verified editor-to-Save keyboard focus, no horizontal overflow at 390px, an empty error console and persisted 6/6 results after reload. Captures remain ignored under `apps/web/test-results`; no private content is captured.

All 16 retained SQL/snapshot/journal files were checked against the starting revision. Test/build/preview databases are disposable and removed after use; no existing database or volume was migrated, reset or deleted.

## Remaining limits

- CI and local automated checks use synthetic providers/data; no paid calls or private learner material are used. Live coaching evaluation is explicitly deferred and needs a new model, total budget and owner output review.
- Browser results are untrusted self-study evidence. Reference/case agreement proves internal consistency only; it is not independent semantic correctness or hostile-code attestation.
- Disposable workers support Stop/timeouts/reset but provide no hard browser-process memory quota. [Original runner measurements](../architecture/runner-spike.md) are local samples, not latency guarantees.
- Recent practice views are bounded to 20 records; older records remain in PostgreSQL. The editor remains a textarea. [Further work](../roadmap/next-improvements.md) is proposed separately.
- This pass does not validate hosted CI execution, public/LAN access, multiple users, auth or deployment. The eval CLI remains an empty smoke scaffold, not a quality gate.
