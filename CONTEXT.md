# Ancora Context

Ancora provides short programming challenges for a learner practising locally. Python is the initial language; collections, comprehensions, filtering/transformation, strings and functions cover basic through intermediate practice. See ADR 0011 and docs/product/programming-practice.md.

## Canonical terms

- **Challenge:** stable identity of a programming exercise.
- **Challenge Revision:** immutable statement, structured function contract, requirements, examples, reference solution, cases and provenance for one version.
- **Generation:** the requested concept/difficulty, provider-dispatch allowance and lifecycle producing candidate revisions.
- **Practice Draft:** mutable editor content tied to a challenge revision, preserved separately from a submitted attempt.
- **Attempt:** exact submitted code snapshot and behavioral, technique and execution results tied to a revision/runtime.
- **Assistance:** an explicitly requested hint, coaching response or solution reveal, tied to the selected revision/attempt.
- **Execution Job:** bounded runner request identified by job ID, revision, source/case digests and runtime version.
- **Prompt Version / Trace Reference / Eval Run:** versioned instructions, privacy-safe observability reference and evaluation evidence.

## Principles

- The LLM primarily generates complete new challenges, rather than rewording a fixed exercise bank.
- `concept_generated` content comes from a concept and difficulty. It has no fabricated source/citation lineage. Source-grounded material is deferred.
- Deterministic contracts and execution checks precede optional coaching. Internal reference/case agreement is not independent proof of semantic correctness.
- Use local single-user operation without login or accounts. A dummy identity is unnecessary.
- Challenges, drafts and attempts are distinct from the retired Cards and Reviews.
- Keep submitted code private. Sending it to an external provider requires an explicit assistance action with clear product behavior.
- Browser execution is untrusted self-study evidence and cannot authorize privileged or paid actions.
