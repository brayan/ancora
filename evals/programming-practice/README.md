# Synthetic generation evaluation

`generation-v1.synthetic.json` contains authored test-only wire inputs/outputs from the Python typed fake. They vary function names, scalar/list/dictionary contracts and comprehension techniques. They are never a production challenge bank.

Offline gates: exact wire-schema parity; bounded finite case values; contract/annotation agreement; zero/empty and nonempty cases; duplicate ID/input contradiction checks; no imports/decorators/nested functions; declared comprehension presence; one provider dispatch including malformed, refused, incomplete and interrupted responses; safe HTTP errors and trusted-server boundary. Browser reference/learner checks own execution and cannot independently prove task semantics.

Live quality evaluation separately assesses novelty, statement/contract clarity, semantic correctness, case coverage, level/duration suitability and pedagogical technique. Require an explicitly selected model and spending budget first. Live generation evidence is recorded in the generation execution plan; synthetic pass rates do not measure provider quality.

`hints-v1.synthetic.json` contains public-only inputs for list filtering, string normalization and dictionary filtering, plus a progression/faithfulness rubric. Offline tests use typed fakes and never call a model. Manual hint quality is a separate owner-authorized gpt-6-luna evaluation capped at USD 1 total; actual results and output acceptance are recorded outside Git and summarized in the hint architecture document after verification.

`coaching-v1.synthetic.json` contains public challenge context, synthetic saved attempts and aggregate evidence plus an advisory-feedback/privacy rubric. It never contains real learner code or live model output. Manual coaching output review requires a new model/budget; prior generation/hint allowances do not apply.
