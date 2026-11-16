# Monitoring and Privacy

The UI displays bounded execution state and runtime load/execution duration. Durable generation, attempt, hint and coaching records support recovery through IDs, digests, versions and lifecycle outcomes. Assistance records describe available help, not attested viewing or learning outcomes.

Do not log learner source, expected/actual values, execution stdout/errors, prompts, provider payloads, credentials or raw exception bodies. Test captures and fixtures contain synthetic content only. Browser tracing/video and API access logs are disabled; no external telemetry backend is configured by this feature.

If diagnostics are added later, start with bounded IDs, operation/outcome codes and measured durations. Add version/provider metadata only when available and necessary; missing measurements remain unknown. Prompt/completion tracing is off by default. A telemetry integration needs a concrete scope and reviewed failure/privacy policy; it is not required for local v1.
