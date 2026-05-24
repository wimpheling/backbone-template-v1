#!/usr/bin/env bash
set -euo pipefail

eval "$(APP_ENV=test pnpm exec varlock load --format shell --compact)"

if [[ "${BACKBONE_SKIP_GENERATE:-}" != "1" ]]; then
  just generate
fi

"$@"
