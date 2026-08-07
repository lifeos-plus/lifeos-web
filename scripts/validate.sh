#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

echo "[validate] install locked dependencies"
npm ci

echo "[validate] audit high-severity vulnerabilities"
npm audit --audit-level=high

echo "[validate] verify generated API types"
npm run api:check

echo "[validate] validate translation catalogs"
npm run i18n:check

echo "[validate] build frontend"
npm run build

echo "[validate] lint frontend"
npm run lint

echo "[validate] run frontend tests"
npm test
