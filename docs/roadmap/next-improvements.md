# Next Improvements

The core local loop is implemented: isolated execution, saved drafts/attempts and immutable revisions, generated challenges, recent history, solution reveal, progressive hints and selected-attempt coaching. See [product scope](../product/programming-practice.md).

The [v1 completion pass](../exec-plans/programming-practice.md) reconciled docs, verified fresh setup and disposable upgrades, and passed offline/Chrome checks. [Completion evidence](../testing/v1-completion.md) records results and limits.

Review these optional next slices before implementation:

1. Improve the coding editor and keyboard ergonomics while preserving drafts, focus and execution controls.
2. Expand history navigation beyond bounded recent views, preserving immutable records and explicit selection.
3. Consider privacy-safe diagnostics when a concrete troubleshooting need justifies them. Never capture source, prompts, provider responses or raw execution output by default.

Live coaching quality evaluation is deferred. It needs a new model, total budget and owner review of complete outputs; prior budgets do not apply. CI remains offline.

Authentication, source ingestion, decks/cards, RAG, embeddings, collaboration, uploaded files, queues and public deployment remain outside accepted scope. These proposals do not authorize new features or architecture changes.
