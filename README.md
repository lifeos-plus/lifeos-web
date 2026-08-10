# LifeOS Web UI

[简体中文版](README.zh-Hans.md)

`lifeos-web` is the first-party React Web UI for LifeOS. It is a Vite/React workspace for browser workflows over the LifeOS Web API provided by [`lifeos-cli`](https://github.com/lifeos-plus/lifeos-cli).

The frontend is intentionally local-first: it talks to the same configured database as the terminal-native CLI through the LifeOS Web API and the generated OpenAPI transport contract. The Web API implementation stays in `lifeos-cli`; this repository ships only the browser UI and its build, validation, and dependency tooling.

## Current Scope

Default navigation keeps LifeOS-backed surfaces visible:

- Visions
- Habits
- Planning
- Timelog
- Finance
- Insights / Stats
- Schedule / Calendar
- Notes
- People
- Settings / Config

Unsupported reference-product modules such as food diary, cloud auth, invitations, agent sessions, cardbox, notifications, export APIs, and sage maxims are intentionally absent until LifeOS exposes matching local capabilities.

## Requirements

- Node.js 20.19+ or 22.12+
- npm 10.8.2 (the version declared by the `packageManager` field)

## Development

Run the LifeOS Web API first (from a `lifeos-cli` checkout):

```bash
uv run --extra web --extra postgres lifeos web serve --host 127.0.0.1 --port 8765
```

Then run the Vite frontend:

```bash
npm ci
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8765`.

## Build

```bash
npm ci
npm run build
```

The built `dist/` directory can be served by the LifeOS Web API process:

```bash
lifeos web serve --static-dir <path-to>/lifeos-web/dist
```

## Generated API Types

The FastAPI OpenAPI document published by `lifeos-cli` is the source of truth for transport request and response types in `src/services/api/`.

- `openapi.json` is the committed, pinned baseline of the transport contract.
- `src/services/api/generated/schema.ts` is generated from that baseline; do not hand-edit either file.
- `npm run api:check` regenerates the contract and fails when the committed `schema.ts` was stale.

The pinned contract default is `v1.0.0`. Refresh it after a newer `lifeos-cli` release publishes a new `openapi.json` release asset:

```bash
npm run api:refresh
```

Set `LIFEOS_CLI_SCHEMA_VERSION` to consume a different release tag.

Frontend-only query filters, form drafts, cache projections, and aggregate view models may be derived with `Pick`, `Omit`, intersections, or explicit adapters. Types passed to and returned from the HTTP boundary must come from the generated OpenAPI contract.

## Validation

For repository changes, run the primary validation entrypoint:

```bash
bash ./scripts/validate.sh
```

The baseline installs locked dependencies, rejects high- and critical-severity `npm audit` findings, verifies generated API types, validates translation catalogs, builds the app, lints, runs the unit/component test suite, and runs the Playwright E2E suite.

## E2E Testing

E2E tests live in `e2e/` and cover the core user loop (create a vision, add a task, record a timelog, inspect insights). They run against a real LifeOS Web API (`lifeos-cli web serve`) backed by a throwaway SQLite database in an isolated temporary HOME, so the exercised HTTP transport matches the pinned OpenAPI contract instead of a mock. Your configured database is never touched.

Requirements:

- `lifeos` CLI with Web extras: `uv tool install "lifeos-cli[web,postgres]"`
- Playwright Chromium browser: `npm run test:e2e:install`

Run the suite on demand:

```bash
npm run test:e2e
```

Playwright starts both servers automatically: a temporary LifeOS Web API (`scripts/e2e/start-api.sh`, default port 8765) and the Vite dev server (default port 5173, API proxied to the temporary server). Override ports with `E2E_API_PORT` and `E2E_WEB_PORT`. CI installs browsers with OS dependencies and caches them; runs use 2 workers, 2 retries, and keep a trace on first retry plus an HTML report on failure (`playwright-report/`).

## Project Policies

- Contribution workflow: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security disclosure: [SECURITY.md](SECURITY.md)
- Community expectations: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
