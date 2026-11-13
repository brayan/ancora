# Cost Model

The runner spike makes no LLM calls. Pyodide executes synthetic code locally with self-hosted pinned assets; the browser suite requires no provider key.

Before generation evaluations, select an OpenAI model and explicit spending/request/token budget. Record observed usage, prompt/model/runtime versions, request counts and privacy-safe trace references. Prices must be verified when used; unknown cost remains unknown.

One Generation permits initial dispatch plus at most one correction across every retry layer. Uncertain dispatches consume allowance and are never automatically repeated. Runner messages cannot trigger paid work. Optional assistance has a separate explicit user action and budget.
