# Ancora Context

This document defines canonical domain language for Ancora. Terms should describe product concepts, not framework or storage details.

## Canonical Terms

**Account**

The billing, ownership, and privacy boundary for one or more users. Source material, decks, cards, reviews, eval runs, and traces belong to an account.

**User**

A person who signs in to Ancora and studies within an account. A user creates or reviews study material and may have account-level permissions.

**Source**

Learning material added to Ancora by a user, such as pasted notes, markdown, transcripts, articles, or later uploaded files. A source is the original user-owned material from which study artifacts are derived.

**Source Chunk**

A bounded portion of a source used for retrieval, citation, generation, and traceability. A source chunk should carry enough metadata to identify where it came from without exposing private text unnecessarily.

**Deck**

A user-organized collection of cards for a subject, goal, course, or study workflow. A deck is the main container a learner reviews.

**Card**

The stable identity of a study item. A card represents the learning target across edits, regenerations, reviews, and quality checks.

**Card Version**

A specific version of a card's prompt, answer, citations, metadata, and generated or edited content. Card versions preserve history and allow quality comparisons.

**Review**

A user's study interaction with a card, including the response, rating, result, timing, and scheduling impact. Reviews are the basis for learning progress.

**Prompt Version**

A versioned prompt artifact used by an AI workflow. Prompt versions connect generated outputs to instructions, schemas, model settings, evals, and later improvements.

**Trace Reference**

A stable reference from Ancora product data to an observability record. Trace references allow debugging without copying private source text throughout the product database.

**Eval Run**

An execution of an evaluation suite against prompts, retrieval, grading, generation, or workflows. Eval runs capture inputs, configuration, scores, failures, and report references.

**LLM Trace**

An observability record for an LLM workflow, including metadata such as prompt version, model, latency, token counts, cost, source and chunk identifiers, scores, and related product IDs.

## Product Principles

- Generated study material must be grounded in sources and traceable to source chunks.
- Product flows should be deterministic first and AI-assisted where generation, grading, explanation, or adaptation adds value.
- Auth and account boundaries are part of v1, because private learning material needs clear ownership from the start.
- Pasted text is the first source path. Uploaded file ingestion is deferred until the core vertical slice works.
