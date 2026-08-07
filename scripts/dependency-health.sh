#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

echo "[dependency-health] install locked dependencies"
npm ci

echo "[dependency-health] list outdated packages"
npm outdated --long || true

echo "[dependency-health] run dependency vulnerability audit"
npm audit --audit-level=low
