#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
APP_DIR="${2:-/opt/makemenage}"

if [[ -z "$TARGET" ]]; then
  echo "Usage: scripts/deploy/sync-to-server.sh user@host [/opt/makemenage]"
  exit 1
fi

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'coverage' \
  --exclude 'playwright-report' \
  --exclude 'test-results' \
  ./ "${TARGET}:${APP_DIR}/"

ssh "$TARGET" "cd ${APP_DIR} && chmod +x scripts/server/*.sh && bash scripts/server/install-or-update.sh"
