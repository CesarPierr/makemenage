#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="${ROOT_DIR}/.deploy-state"
LAST_HEAD_FILE="${STATE_DIR}/last_head"

mkdir -p "$STATE_DIR"
cd "$ROOT_DIR"

CURRENT_HEAD="$(git rev-parse HEAD)"
LAST_HEAD=""

if [[ -f "$LAST_HEAD_FILE" ]]; then
  LAST_HEAD="$(cat "$LAST_HEAD_FILE")"
fi

if [[ "$CURRENT_HEAD" == "$LAST_HEAD" ]]; then
  echo "No deploy needed for ${CURRENT_HEAD}"
  exit 0
fi

echo "Deploying ${CURRENT_HEAD}"
bash scripts/server/install-or-update.sh
printf '%s' "$CURRENT_HEAD" > "$LAST_HEAD_FILE"
