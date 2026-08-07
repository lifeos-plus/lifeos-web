# AGENTS.md

The following rules apply to coding agent collaboration in this repository.

## 1. Core Principles

- Keep the `main` branch releasable with small, traceable changes.
- Treat the generated OpenAPI contract as the transport boundary with the
  LifeOS Web API.
- Keep frontend validation green before merging.

## 2. Collaboration Workflow

- Use `gh` CLI for all issue and PR operations. Do not edit through the web UI.
- Never use the Codex GitHub connector or any connector-backed GitHub mutation
  workflow. Issue and PR operations must go through `gh` CLI only.
- Create a new tracking issue for development work that does not already have
  one, and link it in the PR description with `Closes #xx` or `Related #xx`.
- If GitHub permissions, authentication, policy, or environment constraints
  block a required `gh` operation, stop and ask the human collaborator.

## 3. Text and Language Conventions

- Use Simplified Chinese for issues, PR descriptions, comments, and review notes.
- Use English for code, comments, commit messages, and canonical repository
  documents.
- Keep `README.md` in English as the canonical repository entrypoint. Localized
  companions must link back to it.

## 4. Validation

- Use the primary validation entrypoint for code changes:

  ```bash
  bash ./scripts/validate.sh
  ```

- Keep `npm run api:check` green: do not hand-edit `openapi.json` or
  `src/services/api/generated/schema.ts`.
- When the LifeOS Web API publishes a new `openapi.json` release asset, refresh
  the pinned contract with `npm run api:refresh` in the same change that
  consumes it.
- Keep the English and Chinese translation catalogs in sync (`npm run i18n:check`).

## 5. Security and Documentation

- Never commit secrets, tokens, private keys, or `.env` contents.
- Update `SECURITY.md`, `README.md`, and release-related docs when changing
  dependency, publishing, or security-sensitive behavior.

## 6. UI Copy and Tests

- UI-facing strings live in `src/locales/{en,zh}/common.json`; update both
  catalogs together.
- Add or adjust tests that cover the user-visible behavior for feature work.
