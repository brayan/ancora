# Engineering Tradeoffs

ADR 0011 selects a local single-user programming-practice product. Next.js keeps UI/product persistence together; FastAPI/Pydantic AI provides bounded generation, trading cross-language contracts for the selected Python AI stack. PostgreSQL/Drizzle remain the sole migration owner. ADR 0013 records the typed generation boundary and retry allowance.

Browser Pyodide avoids executing learner code on the host. A separate static origin, CSP and disposable workers reduce capabilities and permit timeout/reset; they do not attest results or guarantee a hard browser memory quota. Fixed synthetic exercises prove this boundary before paid generation work.

Auth/source/card product coupling is retired while historical SQL and database data are preserved. Custom additive migrations 0006–0010 extend the existing ledger without schema push or database resets. Separate API/provider schemas and cross-language contracts add deliberate mapping/parity checks; Tach enforces the Python module graph while independent tests keep frameworks out of the core. See [runner limits](../architecture/runner-spike.md), [generation](../architecture/challenge-generation.md) and [coaching](../architecture/selected-attempt-coaching.md).
