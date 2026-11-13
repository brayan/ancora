# Runtime Boundaries

Current synthetic spike: Next.js UI on loopback → dedicated loopback iframe broker → disposable Pyodide worker. Results return as bounded data through the broker to the UI. The worker can fetch only the static runner origin; it cannot reach Next.js, Python service, external network or secrets.

Planned generation: trusted user action → Next.js lifecycle/budget → authenticated local FastAPI/Pydantic AI → OpenAI. Next.js alone persists records in PostgreSQL/Drizzle. Neither runner results nor Python generation responses assign ready status or execute product actions.

See ADR 0011 and runner-spike.md for capability limits and evidence meaning.
