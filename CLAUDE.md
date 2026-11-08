# api.talkpay

NestJS (Fastify adapter) + TypeORM + Postgres API for TalkPay, a chat-driven wallet on the Korapay sandbox. **TEST MODE ONLY**: Korapay test keys, no real money, ever. Package manager: **yarn** (v1). Shape follows `~/projects/bet-pool`.

Workspace-level rules (money, authz, git, learning mode) live in `../CLAUDE.md` and `../.hermes/`. This file covers what is specific to this repo.

## Commands

```bash
docker compose up -d          # postgres:16-alpine on :5432 (volume talkpay-pgdata)
yarn start:dev                # http://localhost:4000, Swagger at /docs, spec at /docs/openapi.json
yarn lint && yarn typecheck && yarn test && yarn build
yarn test:e2e                 # needs Postgres running
yarn migration:show | migration:run | migration:revert
yarn migration:generate database/migrations/<Name>   # diff entities vs DB
yarn migration:create database/migrations/<Name>     # empty migration
```

`migration:*` regenerates the gitignored `ormconfig.ts` from `ConfigService` first (`scripts/generate-typeorm-datasource.ts`), so the CLI and the app always share one connection config.

## Env files

Only `.env.example` is committed. Never create, read, print or commit a real `.env`; tell the human which lines to add. `ConfigService` (`src/common/config/config.service.ts`) is the only place that reads `process.env`, and every key is validated by Joi in `src/common/config/validation.ts`. Add a new variable in three places: the `EnvironmentKeys` enum + getter, the Joi schema, `.env.example`.

## Module convention

Every domain is `src/<domain>/` with:

```
src/<domain>/
├── <domain>.module.ts
├── <domain>.controller.ts     thin: DTO in, use case call, DTO out
├── dto/                       class-validator + @nestjs/swagger decorators (they become the OpenAPI spec Orval reads)
├── entities/                  TypeORM entities (*.entity.ts, auto-loaded)
├── repositories/              data access only; no business rules
├── services/                  reusable domain logic
├── usecases/                  one class per user action; owns the transaction
└── interfaces/                types and ports (e.g. payment provider interface)
```

Shared, non-domain code goes in `src/common/` (config, swagger, guards, filters). Reusable libs go in `libs/<name>` with an `@app/<name>` path alias (see `@app/logger`).

Planned domains (Phase 1+, **not created yet**): `auth`, `users`, `wallet`, `ledger`, `korapay`, `chat`, `agent`. The agent must call the same use cases as the HTTP controllers; it never gets its own path to money.

Routes use URI versioning (`/v1/...`) once domains exist. `/health` is `VERSION_NEUTRAL`.

## Migrations own the schema

- `DATABASE_SYNC=false` everywhere. `ConfigService.getDatabaseSync()` ignores it unless `NODE_ENV=local`, and even locally keep it false. Never turn on sync outside local.
- `migrationsRun` is `false`: the app never migrates itself on boot. Run `yarn migration:run` explicitly (CI does it before e2e).
- Every entity change ships with a generated migration in the same PR. Read the generated SQL before committing it; never edit a migration that has already run on a shared database, write a new one.
- Every migration has a working `down`.

## Money rules

- Amounts are **kobo** stored as Postgres `bigint` (TypeORM returns `bigint` as a string; convert with a transformer to `bigint`, never `number` or float).
- The ledger is the source of truth: double-entry lines, and a balance is the sum of ledger lines, never a mutable counter alone.
- Money-moving use cases run in one DB transaction, lock rows with `SELECT … FOR UPDATE`, and require an `Idempotency-Key`. Korapay webhooks are deduplicated by reference.
- Another user's resource returns 404, not 403.

## Learning-mode boundary

Charis is learning this codebase and writes some parts by hand. **Do not write** the agent loop, the tool registry, or the context builder (the `src/agent/` core); scaffold folders/interfaces only when asked, review that code, and explain. For everything else: explain what/why/alternatives before building a non-trivial piece, and leave a walkthrough note (see `docs/`).

## Done means

`yarn lint`, `yarn typecheck`, `yarn test`, `yarn build`, and `yarn test:e2e` (with Postgres up) all pass. A bug fix comes with a test that fails without the fix.
