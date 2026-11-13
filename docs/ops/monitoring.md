# Monitoring

The runner spike displays execution status and runtime load/execution duration locally. It logs no learner code, expected/actual values, provider payloads or private content. Browser reports may retain synthetic tests only.

Future generation monitoring should use generation/challenge/revision/attempt IDs, digests, prompt/schema/model/runtime versions, usage, deadlines, outcome and trace references. Do not instrument prompts/completions by default. Langfuse integration remains planned; its failure policy must be reviewed before integration.
