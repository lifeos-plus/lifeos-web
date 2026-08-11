# Contributing

Thanks for contributing to `lifeos-web`.

This repository ships the LifeOS Web UI: a Vite/React workspace for browser workflows over the LifeOS Web API provided by [`lifeos-cli`](https://github.com/lifeos-plus/lifeos-cli). Changes should keep the generated API contract, translation catalogs, CI, and security expectations aligned.

## Before You Start

- Read [README.md](README.md) for project scope and local development commands.
- Read [SECURITY.md](SECURITY.md) before changing dependencies, CSP, or contract-pinning behavior.
- Read [AGENTS.md](AGENTS.md) if you are contributing through an automated coding workflow.

## Development Setup

Requirements:

- Node.js 22.12+ or 24.0+ (LTS)
- npm 11.17.0 (the version declared by the `packageManager` field)

Install dependencies:

```bash
npm ci
```

## Validation

Run the default validation baseline before opening a PR:

```bash
bash ./scripts/validate.sh
```

The validation baseline installs the locked npm workspace, rejects high- and critical-severity `npm audit` findings, verifies that the generated OpenAPI types are current (`npm run api:check`), validates the translation catalogs, builds the Vite app, runs ESLint, executes the Vitest suite, and runs the Playwright E2E suite.

Prefer `npm ci` for local validation runs that should not rewrite the lockfile, and use the npm version declared by `package.json` when updating `package-lock.json`.

ESLint must stay at zero warnings. Warnings do not fail `validate.sh` but appear as CI annotations (yellow warning markers) in the PR diff, where they are easy to overlook. Run the lint with warnings treated as errors before pushing:

```bash
npm run lint -- --max-warnings 0
```

This catches issues such as missing React hook dependencies (`exhaustive-deps`) in the same change that introduces them.

### E2E Testing

E2E tests live in `e2e/` and cover the core user loop (create a vision, add a task, record a timelog, inspect insights) plus a navigation smoke test. They run against a real LifeOS Web API (`lifeos-cli web serve`) backed by a throwaway SQLite database in an isolated temporary HOME, so the exercised HTTP transport matches the pinned OpenAPI contract instead of a mock. Your configured database is never touched.

Requirements:

- `lifeos` CLI with Web extras: `uv tool install "lifeos-cli[web,postgres]==1.0.2"`
- Playwright Chromium browser: `npx playwright install chromium`

Run the suite on demand:

```bash
npm run test:e2e
```

Playwright starts both servers automatically: a temporary LifeOS Web API (`scripts/e2e/start-api.sh`, default port 8765) and the Vite dev server (default port 5173, API proxied to the temporary server). Override ports with `E2E_API_PORT` and `E2E_WEB_PORT`. CI installs browsers with OS dependencies and caches them; runs use 2 workers, 2 retries, and keep a trace on first retry plus an HTML report on failure (`playwright-report/`).

## API Contract Policy

- `openapi.json` is the committed, pinned baseline of the LifeOS Web API transport contract.
- `src/services/api/generated/schema.ts` is generated from that baseline. Do not hand-edit either file.
- `lifeos-cli` publishes `openapi.json` as a GitHub Release asset. Refresh the pinned contract after a release:

  ```bash
  npm run api:refresh
  ```

  The default pinned release is `v1.0.2`. Set `LIFEOS_CLI_SCHEMA_VERSION` to consume a different release tag.
- `npm run api:check` regenerates the contract and fails when the committed `schema.ts` is stale.

## Dependency Maintenance

- `.github/dependabot.yml` checks the npm workspace weekly with only semver minor version updates. Patch updates are excluded from routine PRs, and major migrations are explicit tasks.
- Frontend dependency updates use the `frontend` and `dependencies` labels, with runtime and tooling dependency groups kept separate.
- `bash ./scripts/dependency-health.sh` is the explicit maintainer audit flow for outdated packages and low-severity audit findings.
- `.github/workflows/dependency-audit.yml` runs a weekly audit, opens a draft PR when non-force `npm audit fix --package-lock-only` produces changes for `package-lock.json` or `package.json`, and fails when high- or critical-severity findings remain afterward.

## Change Expectations

- Keep code, comments, commit messages, and canonical repository docs in English.
- Localized Markdown companions are allowed when the English source stays canonical, the documents are cross-linked, and the localized copy is updated together with the source.
- Keep issue and PR collaboration in Simplified Chinese for this repository.
- Prefer explicit, additive changes over hidden behavioral shifts.

## Git and PR Workflow

- Branch from the latest `main`.
- Use `git fetch` and `git merge --ff-only` to sync from `main`.
- Do not push directly to protected branches.
- Create or link a tracking issue for substantive development work.
- Use English commit-message style for PR titles.
- Link relevant issues in the PR description using `Closes #xx` or `Related #xx`.
- Use the `gh` CLI for all issue and PR operations.

## Documentation

- Keep `README.md` as the canonical English entry document.
- Localized entry documents such as `README.zh-Hans.md` are allowed when they clearly link to the canonical English version and the English version links back to them.
- UI-facing strings live in `src/locales/en/common.json` and `src/locales/zh/common.json`; update both catalogs together and keep `npm run i18n:check` green.
- Update [SECURITY.md](SECURITY.md) and [README.md](README.md) when changing dependency, contract-pinning, or security-sensitive behavior.
