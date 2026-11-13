# Browser Runner Spike

## Scope and decision

One synthetic `positive_even` function exercises the boundary before persistence or live generation. Pyodide 314.0.7 is pinned and served locally from the locked npm dependency. No CDN calls or automatic package loading. FastAPI is not scaffolded, and generated Python is never executed in host Python or a server process.

Next.js runs at http://127.0.0.1:3000. A read-only static server binds http://127.0.0.1:3001, serves an allowlist and rejects unknown paths, query strings, unexpected Host/Origin and mutation methods. It does not proxy requests or log URLs/bodies. The iframe has a separate origin; workers get CSP directly on their script response. `connect-src 'self'` allows runtime loading from that static origin and blocks application/external fetch/WebSocket operations. No credential or privileged application object crosses the message boundary.

The trusted broker creates one module worker per job, resets a 30-second bootstrap deadline to a 2-second execution deadline after load, caps output at 8,000 characters and terminates workers on completion/failure/Stop. A parent watchdog handles lost broker responses. Neither worker code nor its messages can reset the broker's execution deadline or dispatch product/provider actions. No SharedArrayBuffer or global COOP/COEP changes are needed for hard worker termination.

## Protocol and validation meaning

Versioned requests/results carry job/revision/source/case/runtime bindings. Runtime parsers bound source (12,000 characters), cases (12), lists (1,000), integer magnitude (1,000,000), reports (64,000 characters), output and errors. Digests use UTF-8 SHA-256 and canonical request-case JSON serialization. Stale/malformed/oversized responses are rejected. The harness constructs calls from data, deep-copies inputs and checks output type/value/order/duplicates plus mutation.

Technique checks verify a directly returned list comprehension or a simple comprehension assignment immediately returned. Other patterns containing a comprehension are inconclusive. A missing comprehension fails the technique requirement. Decorators, module-level rebinding and unsupported function bodies are inconclusive. Input comparison detects changes remaining after return; it does not prove the absence of temporary mutations. This is a supported-syntax check, not a proof of dataflow or purity. Results can be forged by hostile code within a worker, so none are security attestation or authoritative grades. Expected outputs are trusted synthetic fixture values in this spike; model/reference-derived case provenance belongs to later generation contracts.

## Evidence and limits

Validation evidence is recorded below from the real-Chrome suite. The suite covers correct/incorrect/runtime-error solutions, boundaries/order/duplicates/mutation, technique uncertainty, infinite loops, Stop/output cap and recovery, runtime contamination, stale messages, static-only HTTP, retired-route removal, Python-JS fetch attempts against a local canary/application/external URL and worker action-message rejection.

A 16 MiB allocation probe demonstrates recovery for a bounded allocation, not a memory cap. JavaScript/WASM may consume enough memory to crash the tab/browser before message-size checks run. Worker termination is not a hard process quota. A malicious worker can also forge self-study results or flood the browser with messages; no certification/competitive grading is supported. Local static same-origin asset requests remain possible, but cannot perform product or paid actions. A new runner design is required if later threat requirements exceed this boundary.

Cold asset transfer and fresh-runtime startup are measured separately from function execution. Proposed local target: warm fresh-worker startup under 3 seconds, Stop/timeout recovery without reloading, and successful next runs. Results depend on hardware/cache. No live LLM evaluation, server sandbox or public deployment has been validated.

## Reproduction

`pnpm install --frozen-lockfile`, installed Google Chrome, then `pnpm web:test:browser`. Playwright starts both loopback origins itself and refuses to reuse other servers. `pnpm dev` is the manual equivalent. Only synthetic screenshots are saved under ignored test-results; tracing/video are off. Existing database volumes are never opened/reset by these commands.

## Verified local result — 2026-11-13

- `pnpm repo:test:pr`: passed context routing, shared-package types, web naming/ESLint/types, eval types, Docker Compose syntax, 7 web unit/history tests, 1 eval-scaffold test and scaffold smoke.
- `pnpm web:test:browser`: 11/11 passed in Google Chrome 157.0.8103.79 through Playwright 1.65.0 (44.0 seconds for the suite). Desktop 1280×720 and mobile 390×844 were rendered and inspected; keyboard focus and page overflow checked; ordinary UI console errors/failed requests were empty.
- Fresh warm-cache workers with a 16 MiB per-case allocation probe loaded in 1,082 / 1,066 / 1,058 ms; execution took 3 / 3 / 7 ms. These are three local samples, not a percentile or hardware-independent guarantee. Cold browser context/asset loading and actual reference runs also completed in the suite; cold transfer was not separately benchmarked.
- Network probes used Python-JS `fetch` and synchronous XMLHttpRequest against a CORS-permissive loopback canary, application generation URL and external URL. Requests were rejected; the canary received zero requests. An action-shaped worker message was rejected and the next valid run succeeded.
- Review fixes: cached-iframe handshake race; strict loaded-message parsing and digest verification; function rebinding/decorator technique uncertainty; explicit reference-result labeling; bounded stream output and stream error handling; fixed loopback startup ports. Regression coverage is in the browser/protocol suites.
- Historical SQL/snapshots have no diff; the spike neither connects to nor resets a database. The original checkout remains a recovery copy, including its uncommitted deck/card migration `0005` and journal. The future persistence slice must reconcile that checkout and the actual local schema before choosing a migration baseline.

No live model generation, durable draft/attempt workflow, public deployment, hard memory quota or authoritative security attestation is claimed. The spike supports proceeding to the reviewed persisted fixed-exercise slice within these limits.
