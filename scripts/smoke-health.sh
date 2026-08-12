#!/usr/bin/env bash
# =============================================================
#  Stack sağlık özeti (smoke)
# =============================================================

set -uo pipefail

pass=0
fail=0

check() {
  local name="$1" url="$2"
  code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 8 "$url" || echo 000)"
  if [[ "$code" == "200" || "$code" == "301" || "$code" == "302" ]]; then
    echo "  OK  $name ($code)"
    pass=$((pass + 1))
  else
    echo "  FAIL $name ($code) — $url"
    fail=$((fail + 1))
  fi
}

echo "=== Container durumu ==="
docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Health}}' 2>/dev/null \
  || docker compose ps

echo ""
echo "=== HTTP health ==="
check gateway   "http://127.0.0.1:8001/health"
check storefront "http://127.0.0.1:3000/"
check identity  "http://127.0.0.1:5001/health"
check catalog   "http://127.0.0.1:5002/health"
check basket    "http://127.0.0.1:5038/health"
check order     "http://127.0.0.1:5059/health"

echo ""
echo "Sonuç: $pass geçti, $fail başarısız"
[[ "$fail" -eq 0 ]]
