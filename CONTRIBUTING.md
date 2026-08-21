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

The validation baseline installs the locked npm workspace, rejects high- and critical-severity `npm audit` findings, verifies that the generated OpenAPI types are current (`npm run api:check`), validates the translation catalogs, builds the Vite app, runs ESLint, executes the Vitest suite with coverage (`npm run test:coverage`), enforces diff coverage on the lines added by the change, and runs the Playwright E2E suite. Global coverage floors are configured in `vite.config.ts`; the diff-coverage gate (`scripts/check-diff-coverage.mjs`, default 70%, override with `DIFF_COVERAGE_THRESHOLD`) fails a PR when its newly added source lines are not covered enough, so untested new code cannot hide behind the aggregate percentage. Raise the global floors as coverage improves.

Prefer `npm ci` for local validation runs that should not rewrite the lockfile, and use the npm version declared by `package.json` when updating `package-lock.json`.

ESLint must stay at zero warnings. The `lint` script enforces this with `--max-warnings 0`, so both local runs and the `validate.sh` baseline fail on any warning. Warnings that slip through would otherwise appear only as CI annotations (yellow warning markers) in the PR diff, where they are easy to overlook:

```bash
npm run lint
```

This catches issues such as missing React hook dependencies (`exhaustive-deps`) in the same change that introduces them.

### E2E Testing

E2E tests live in `e2e/` and cover the core user loop (create a vision, add a task, record a timelog, inspect insights) plus a navigation smoke test. They run against a real LifeOS Web API (`lifeos-cli web serve`) backed by a throwaway SQLite database in an isolated temporary HOME, so the exercised HTTP transport matches the pinned OpenAPI contract instead of a mock. Your configured database is never touched.

Requirements:

- `lifeos` CLI with Web extras: `uv tool install "lifeos-cli[web,postgres]==$(node scripts/pinned-cli-version.mjs)"` (the pinned version is printed by the same command)
- Playwright Chromium browser: `npx playwright install chromium`

Run the suite on demand:

```bash
npm run test:e2e
```

Playwright starts both servers automatically: a temporary LifeOS Web API (`scripts/e2e/start-api.sh`, default port 8765) and the Vite dev server (default port 5173, API proxied to the temporary server). Override ports with `E2E_API_PORT` and `E2E_WEB_PORT`. CI installs browsers with OS dependencies and caches them; runs use 2 workers, 2 retries, and keep a trace on first retry plus an HTML report on failure (`playwright-report/`).

## API Contract Policy

- `scripts/pinned-cli-version.mjs` is the version-controlled contract authority: it pins the `lifeos-cli` release that defines the Web API transport contract.
- `openapi.json` is a generated, gitignored artifact — the document published by the pinned release, downloaded verbatim by `npm run api:fetch` (part of `api:refresh`). It is not committed; there is exactly one source of truth (the release asset) and no copy that can drift.
- `src/services/api/generated/schema.ts` is generated from that document and committed for developer tooling. Do not hand-edit it.
- `lifeos-cli` publishes `openapi.json` as a GitHub Release asset. Consume a new release in the same change:

  ```bash
  # 1) bump scripts/pinned-cli-version.mjs to the new release tag
  # 2) refresh the local document and regenerate the TypeScript contract
  npm run api:refresh
  ```

  Set `LIFEOS_CLI_SCHEMA_VERSION` to consume a different release tag without editing the pin. `node scripts/pinned-cli-version.mjs` prints the CLI version used by CI and the E2E harness.
- `npm run api:check` regenerates the contract from the fetched document and fails when the committed `schema.ts` is stale. CI fetches the pinned document before checking.

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

- Align local `main` with `origin/main` (`git fetch` + `git merge --ff-only`), then create a new worktree from `main`.
- Use `git fetch` and `git merge --ff-only` to sync from `main`.
- Do not push directly to protected branches.
- Create or link a tracking issue for substantive development work.
- Use English commit-message style for PR titles.
- Link relevant issues in the PR description using `Closes #xx` or `Related #xx`.
- Use the `gh` CLI for all issue and PR operations.

## Release Process

`lifeos-web` is versioned independently of `lifeos-cli`:

- The app version lives in `package.json` (`version`) and is the single source of truth for release tags (`vX.Y.Z`, semver).
- Every release records the pinned LifeOS Web API contract version it was built against (`lifeos-cli vX.Y.Z` from `scripts/pinned-cli-version.mjs`).
- To release:
  1. Merge the version bump and intended changes to `main`.
  2. Tag the `main` tip with the version and push the tag:
     ```bash
     git tag -a v1.0.0 -m "lifeos-web v1.0.0"
     git push origin v1.0.0
     ```
  3. The `Release Web` workflow (`.github/workflows/release.yml`) validates the baseline, verifies the tag matches `package.json` and is reachable from `main`, and publishes a GitHub Release with auto-generated notes.
- The same workflow can be re-run manually from the Actions tab (with an existing `v*` tag) to repair a missing or broken release.
- `lifeos-web` is never published to npm: `package.json` stays `"private": true`.

## Documentation

- Keep `README.md` as the canonical English entry document.
- Localized entry documents such as `README.zh-Hans.md` are allowed when they clearly link to the canonical English version and the English version links back to them.
- UI-facing strings live in `src/locales/en/common.json` and `src/locales/zh/common.json`; update both catalogs together and keep `npm run i18n:check` green.
- Update [SECURITY.md](SECURITY.md) and [README.md](README.md) when changing dependency, contract-pinning, or security-sensitive behavior.
