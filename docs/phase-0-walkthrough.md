# Phase 0 walkthrough: api.talkpay

What was scaffolded, why each piece is shaped the way it is, and what the alternatives were. Read it top to bottom once, with the files open beside it.

## 1. Versions: why not the latest majors

`yarn add` with no versions pulled NestJS 12, TypeORM 1.x, TypeScript 7, Jest 30 and ESLint 10. NestJS 12 ships as ESM only, TypeScript 7 is the new native compiler, and the typescript-eslint and ts-jest peer ranges don't accept it yet. Taking them would have meant moving off bet-pool's CommonJS + ts-node + ts-jest setup on day one. So the repo is pinned to bet-pool's major lines instead: Nest 11, TypeORM 0.3, TypeScript 5.9, Jest 29, ESLint 9 (`package.json`). Moving to Nest 12 / ESM later is its own task with its own ADR.

## 2. Fastify instead of Express (`src/main.ts`)

`NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())`. Nest is an abstraction over an HTTP server. Fastify is faster, validates and serialises with schemas, and is what bet-pool uses. The cost: Express middleware doesn't drop in (you use Fastify plugins), and some libraries need a Fastify variant (Swagger UI needs `@fastify/static`). Alternatives: Express (the Nest default and the biggest ecosystem), or plain Fastify with no Nest.

`bufferLogs: true` + `app.useLogger(app.get(Logger))` holds Nest's startup logs until pino is ready, so every line goes through the same logger.

## 3. The request pipeline (`src/app.setup.ts`)

Pulled out of `main.ts` so the e2e tests run the exact same setup as production:

- **Global `ValidationPipe`**: `whitelist` strips properties that have no decorator on the DTO, `forbidNonWhitelisted` turns those into a 400 instead, `forbidUnknownValues` rejects non-objects, and `transform` turns the JSON into real DTO class instances (with type conversion). For a wallet this matters: a client can't sneak in `{ "amount": 100, "userId": "someone-else" }`.
- **URI versioning**: routes become `/v1/...` when a controller declares `version: '1'`. `/health` is `VERSION_NEUTRAL` so load balancers and the Dockerfile healthcheck can hit a stable URL. Alternatives: header or media-type versioning; URI is the easiest to see in logs and curl.

## 4. Config (`src/common/config/`)

Two layers, copied from bet-pool:

1. `@nestjs/config`'s `ConfigModule.forRoot({ validationSchema })` loads `.env` (if there is one) and validates **every** variable against the Joi schema in `validation.ts` at boot. A missing `DATABASE_HOST` crashes startup with a clear error instead of failing on the first query.
2. A small custom `ConfigService` with one typed getter per key. The rest of the app never touches `process.env`.

`getDatabaseSync()` only returns true when `DATABASE_SYNC=true` **and** `NODE_ENV=local`, so a wrong env file can't make TypeORM rewrite a shared database. The unit test (`config.service.spec.ts`) pins that rule down.

Alternatives: `@nestjs/config`'s own `ConfigService.get('KEY')` (stringly typed), or Zod instead of Joi (bet-pool uses Joi; Zod is what mobile uses).

## 5. Logger (`libs/logger`, alias `@app/logger`)

`nestjs-pino` gives JSON logs and one log line per HTTP request (`pino-http`), with a request id. `LoggerService` is bet-pool's wrapper that writes a fixed shape (`channel`, `message`, `correlation_id`, …) so logs can be searched. Changes from bet-pool: pretty, single-line output when `NODE_ENV` is local/development; `Authorization` and `Cookie` headers redacted; `/health` requests not logged.

It lives in `libs/` because it isn't a domain: it's reusable infrastructure, and the path alias (`tsconfig.json` `paths`, Jest `moduleNameMapper`) makes the import look like a package. `nest build` rewrites the alias to a relative path in `dist/`.

## 6. Swagger / OpenAPI (`src/common/swagger/swagger.ts`)

`/docs` serves the Swagger UI and **`/docs/openapi.json`** serves the raw spec. Mobile's Orval reads that JSON and generates the typed API client and Zod schemas. That makes the DTO decorators (`@ApiProperty`, etc.) the API contract: if a DTO is wrong, the mobile types are wrong. Swagger is served in every environment for now, because it's a test-mode portfolio API.

## 7. Health (`src/health/`)

`GET /health` uses `@nestjs/terminus`: `TypeOrmHealthIndicator.pingCheck('database')` runs `SELECT 1`. It returns 200 with `{ status: 'ok', info: { database: { status: 'up' } } }`, or **503** when the DB is down, which is what Docker/K8s/load balancers act on. Alternative: a hand-written controller running `dataSource.query('SELECT 1')`. Terminus is the standard Nest answer and adds Redis/HTTP/disk indicators later for free.

## 8. Database: migrations own the schema

- `docker-compose.yml`: `postgres:16-alpine`, a named volume (`talkpay-pgdata`) so data survives `docker compose down`, a `pg_isready` healthcheck, port 5432. No Redis until Phase 7.
- `ConfigService.getTypeOrmConfig()`: `synchronize` is off (see §4), `migrationsRun: false` (the app never migrates itself on boot; you run migrations as a deliberate step), `autoLoadEntities: true`.
- `scripts/generate-typeorm-datasource.ts` (from bet-pool) writes a gitignored `ormconfig.ts` from the same `ConfigService`. Every `migration:*` script runs it first (`pretypeorm:ds`), so the CLI can never point at a different DB than the app.
- `database/migrations/` is empty, waiting for your baseline (below). `database/seed/` stays empty until Phase 1.

**Why not `synchronize: true`?** Sync diffs entities against the live DB and applies changes, including drops, with no review and no history. On a ledger that's how you lose data. Migrations are reviewed SQL files, in git, applied in order, with a `down` to revert.

## 9. Tests

- Unit (`yarn test`, `src/**` and `libs/**` `*.spec.ts`): config sync rule, health controller wiring, logger.
- e2e (`yarn test:e2e`, `test/health.e2e-spec.ts`): boots the real `AppModule` against a real Postgres, then uses Fastify's `inject` (no open port) to check `/health` and that `/docs/openapi.json` documents `/health`.

## 10. CI (`.github/workflows/ci.yml`)

Job `check`: install → lint → typecheck → unit → build. Job `e2e` (after `check`): a `postgres:16-alpine` service container, `yarn migration:run`, then `yarn test:e2e`. Env vars live in the workflow; there's no `.env` in CI. No deploy job.

## 11. Dockerfile

bet-pool's runtime-only image: CI builds `dist/`, the image installs production deps and copies `dist/`. Port and healthcheck are 4000 / `/health`. Not used locally yet: you run the API with `yarn start:dev` and only Postgres in Docker.

## 12. Your step: the baseline migration (you drive)

See the hand-off message for the exact commands. The short version: `yarn migration:create database/migrations/Baseline` writes an empty, timestamped migration class; `yarn format` makes it match prettier; `yarn migration:run` applies it, creating TypeORM's `migrations` table and recording the baseline as row 1. Empty is fine: Postgres 16 has `gen_random_uuid()` built in, so no `CREATE EXTENSION` is needed yet. From Phase 1 on, `migration:generate` writes real SQL by diffing your entities against the DB.

## Explain-back questions

1. What would happen if `DATABASE_SYNC=true` slipped into a staging env file? Which line stops it?
2. Why is `migrationsRun` false, and who runs migrations in CI?
3. A client posts an extra `userId` field to a future transfer endpoint. What happens, and which option causes it?
4. Why does `/health` return 503 rather than 200 with `"database": "down"`?
5. How does a DTO change on the server reach the mobile app's types?
