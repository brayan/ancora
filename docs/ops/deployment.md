# Deployment Scope

Current support is local single-user use. `pnpm dev` starts Next.js on 127.0.0.1:3000 and the static runner on 127.0.0.1:3001. Neither server binds a public interface. No login is provided. The runner accepts only its configured application origin and serves allowlisted static assets with restrictive CSP.

The runner spike requires neither a database nor provider credentials. PostgreSQL configuration is retained for later persistence; existing volumes/migrations are preserved. FastAPI startup, hosted deployment, service credentials and provider integration are future slices under ADR 0011. Public/LAN access or multiple users require a reviewed authentication/deployment design before exposure.
