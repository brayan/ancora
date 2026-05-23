.PHONY: dev lint test eval-smoke db-migrate db-seed docker-up docker-down guards-fast guards-task guards-context guards-pr

dev:
	pnpm dev

lint:
	pnpm lint

test:
	pnpm test

eval-smoke:
	pnpm eval:smoke

db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed

docker-up:
	pnpm docker:up

docker-down:
	pnpm docker:down

guards-fast:
	pnpm guards:fast

guards-task:
	pnpm guards:task

guards-context:
	pnpm guards:context

guards-pr:
	pnpm guards:pr
