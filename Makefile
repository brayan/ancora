.PHONY: dev lint test eval-smoke db-migrate db-seed docker-up docker-down repo-test-fast repo-test-task repo-test-context repo-test-pr guards-fast guards-task guards-context guards-pr

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
	pnpm repo:test:fast

guards-task:
	pnpm repo:test:task

guards-context:
	pnpm repo:test:context

guards-pr:
	pnpm repo:test:pr

repo-test-fast:
	pnpm repo:test:fast

repo-test-task:
	pnpm repo:test:task

repo-test-context:
	pnpm repo:test:context

repo-test-pr:
	pnpm repo:test:pr
