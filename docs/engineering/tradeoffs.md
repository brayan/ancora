# Engineering Tradeoffs

ADR 0011 selects a local single-user programming-practice product. Next.js keeps UI/product persistence together; FastAPI/Pydantic AI is a bounded planned generation service, trading cross-language contracts for the selected Python AI stack. PostgreSQL/Drizzle remain the sole migration owner.

Browser Pyodide avoids executing learner code on the host. A separate static origin, CSP and disposable workers reduce capabilities and permit timeout/reset; they do not attest results or guarantee a hard browser memory quota. Fixed synthetic exercises prove this boundary before paid generation work.

Retire auth/source/card product coupling, preserve historical SQL and database data, and defer the persistence migration decision. See docs/architecture/runner-spike.md for measured limitations.
