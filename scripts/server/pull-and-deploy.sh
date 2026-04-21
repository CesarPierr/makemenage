#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

CURRENT_COMMIT="$(git rev-parse HEAD)"
git fetch origin main
REMOTE_COMMIT="$(git rev-parse origin/main)"

if [[ "$CURRENT_COMMIT" == "$REMOTE_COMMIT" ]]; then
  echo "Already up to date at ${CURRENT_COMMIT}"
  exit 0
fi

git pull --ff-only origin main
bash scripts/server/install-or-update.sh
