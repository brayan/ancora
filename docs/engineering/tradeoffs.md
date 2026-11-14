# Engineering Tradeoffs

ADR 0011 selects a local single-user programming-practice product. Next.js keeps UI/product persistence together; FastAPI/Pydantic AI provides bounded generation, trading cross-language contracts for the selected Python AI stack. PostgreSQL/Drizzle remain the sole migration owner. ADR 0013 records the typed generation boundary and retry allowance.

Browser Pyodide avoids executing learner code on the host. A separate static origin, CSP and disposable workers reduce capabilities and permit timeout/reset; they do not attest results or guarantee a hard browser memory quota. Fixed synthetic exercises prove this boundary before paid generation work.

Auth/source/card product coupling is retired while historical SQL and database data are preserved. Custom additive migrations 0006/0007 extend the existing ledger without schema push or database resets. See docs/architecture/runner-spike.md for measured limitations and docs/architecture/challenge-generation.md for the current lifecycle.
