# Security Policy

## Scope

This repository ships the LifeOS Web UI: a Vite/React workspace, the npm lockfile, frontend validation scripts, and dependency audit workflows. It does not publish to PyPI and does not hold backend credentials.

## Security-Relevant Areas

- npm dependency lockfile, audit, and dependency-review flows
- Content-Security-Policy configuration in `vite.config.ts`
- the pinned OpenAPI contract consumed from `lifeos-cli` releases
- `.env.example` and repository examples that must not expose secrets

## Reporting a Vulnerability

Please avoid posting secrets, tokens, or sensitive environment details in public issues.

Preferred disclosure order:

1. Use GitHub private vulnerability reporting if it is enabled for this repository.
2. If private reporting is unavailable, contact the repository maintainer directly through GitHub before opening a public issue.
3. Use a normal public issue only for low-risk hardening ideas that do not expose private data.

## Dependency Policy

Routine dependency updates are intentionally limited to weekly minor updates; patch updates are excluded from routine PRs. Security updates remain eligible independently.

PR and `main` validation rejects high- and critical-severity `npm audit` findings. The weekly frontend audit may prepare a non-force lockfile fix, but it still fails when high- or critical-severity findings remain after that attempt. The audit workflow never uses `npm audit fix --force`.

## Supported Branches

Security fixes should land on the active `main` branch first.
