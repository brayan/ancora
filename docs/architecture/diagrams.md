# Runtime Boundaries

Execution: Next.js UI on loopback → dedicated loopback iframe broker → disposable Pyodide worker. Fixed and generated challenges use the same isolated boundary. Results return as bounded data through the broker to the UI. The worker can fetch only the static runner origin; it cannot reach Next.js, Python service, external network or secrets.

Generation and requested assistance: explicit learner action → Next.js lifecycle/dispatch allowance → trusted-server-token-protected local FastAPI/Pydantic AI → OpenAI. Coaching additionally requires explicit sharing of one saved attempt. Next.js alone persists records in PostgreSQL/Drizzle. Neither runner results nor Python responses assign ready status or execute product actions. This server token does not introduce learner accounts or login.

See [the system overview](system-overview.md), [coaching boundary](selected-attempt-coaching.md) and [runner limits](runner-spike.md).
