#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="${ROOT_DIR}/.deploy-state"
LOG_FILE="${STATE_DIR}/cron.log"
CRON_LINE="*/5 * * * * cd ${ROOT_DIR} && bash scripts/server/deploy-if-head-changed.sh >> ${LOG_FILE} 2>&1"

mkdir -p "$STATE_DIR"

CURRENT_CRONTAB="$(mktemp)"
trap 'rm -f "$CURRENT_CRONTAB"' EXIT

crontab -l > "$CURRENT_CRONTAB" 2>/dev/null || true

if ! grep -Fqx "$CRON_LINE" "$CURRENT_CRONTAB"; then
  printf '%s\n' "$CRON_LINE" >> "$CURRENT_CRONTAB"
  crontab "$CURRENT_CRONTAB"
fi

printf 'Installed local deploy cron:\n%s\n' "$CRON_LINE"
