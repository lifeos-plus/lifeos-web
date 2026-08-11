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

- Node.js 20.19+, 22.12+, or 24.0+ (LTS)
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

The pinned contract default is `v1.0.2`. Refresh it after a newer `lifeos-cli` release publishes a new `openapi.json` release asset:

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

The baseline installs locked dependencies, rejects high- and critical-severity `npm audit` findings, verifies generated API types, validates translation catalogs, builds the app, lints, and runs the test suite.

## Project Policies

- Contribution workflow: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security disclosure: [SECURITY.md](SECURITY.md)
- Community expectations: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
