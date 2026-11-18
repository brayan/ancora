# Practice assistance: solution reveal

This describes the solution-reveal slice after merged generation PR #9. The [progressive-hints extension](progressive-hints.md) adds separately requested hints and attempt hint snapshots. ADRs 0011–0014 retain runtime, privacy and storage ownership. Progressive provider hints and selected-attempt coaching follow separately; this slice makes no provider calls and sends no submitted code externally.

## Behavior and contracts

Reveal is an explicit, confirmed learner action. Display the reference beside the practice workflow, never replace the editor or change the challenge, cases, draft or verdict. A recorded reveal remains recorded when its code is hidden or the page reloads. Normal session/attempt projections contain assistance metadata, not reference code. Reopening an already revealed solution still requires an explicit request.

The existing bounded, no-store `POST /api/practice/reference` envelope remains the source-delivery contract. It now records the first reveal before returning source. Failed or lost responses can be retried idempotently. Its exact local Host/Origin check rejects the runner origin. Separate reference runs use the same disposable runner and do not create learner attempts or duplicate reference code in result snapshots.

Sessions add the first reveal time for their exact immutable revision. Attempts add a server-derived `solutionRevealed` snapshot. A later reveal does not rewrite older attempts, including idempotent submission retries. This is recorded self-study assistance, not a claim that the learner never saw source through inspectable runner envelopes or other tools.

## Persistence and ordering

Migration history was reviewed through 0007, including the reserved legacy 0005 and guarded ledger upgrade. Add custom migration 0008 without schema diff generation, changing any retained migration, or resetting a database. Next.js/Drizzle remain the only writer. Test migrations on disposable PostgreSQL, including an existing 0007 history with attempts and the known legacy history.

An immutable `practice_solution_reveals` row stores the first reveal per revision. `practice_attempts.solution_revealed` defaults to false for existing rows; their historical assistance was not collected. New submissions capture the recorded reveal state transactionally. Submission and reveal acquire the same revision row lock, defining a stable order across tabs. Existing attempt immutability protects the new snapshot column too. Replays preserve the original snapshot.

## Acceptance

Cancel reveals nothing and writes nothing. Confirm records before returning source, leaves edits intact, and shows the reference read-only. Hide/reload does not clear assistance; opening another revision cannot show the previous solution. Attempts before and after reveal keep distinct snapshots across reload, concurrent tabs and retries. Unready/missing revisions cannot be revealed. Storage failure never returns source. Origin and strict request checks reject forged assistance fields. Chrome checks cover desktop/mobile layout, keyboard flow, errors, reload and separate reference execution, using synthetic content only.

## Verified local result

- `pnpm repo:test:pr`: passed convention/format/type/contract checks, 16 quality fixtures, 20 web unit tests, 29 disposable-PostgreSQL integration tests and eval scaffold checks.
- `pnpm python:check`: Ruff lint/format, strict Pyright and 135 offline tests passed, including the updated shared checker fixtures. Copied checker/test bytes and their recorded checksums match merged playbook commit `4e2a26c`.
- `pnpm web:test:browser`: 41 tests passed in installed Google Chrome, including five assistance scenarios and existing generation, persistence and runner regressions. Desktop/mobile captures were inspected; keyboard focus, 390px overflow and normal-flow console/network checks passed. Injected failures belong only to explicit negative-path tests.
- The 12 pre-existing SQL/snapshot files are byte-for-byte unchanged; the journal only appends 0008. Fresh, known-legacy and 0006/0007 upgrades passed on disposable databases. No existing local database was migrated or reset, and no paid provider calls were made.

Synthetic captures remain ignored under `web/test-results/assistance-{desktop,mobile}.png`. No hosted CI or publication is claimed for this local branch. Review this contract and migration first, then repository/service ordering, UI and regression tests. Hints/coaching and complete paginated history remain separate work; recent attempts remain bounded to 20 per revision.
