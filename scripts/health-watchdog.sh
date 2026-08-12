#!/usr/bin/env bash
# =============================================================
#  E-ticaret self-healing watchdog
# =============================================================
# Container process ayaktayken "donmuş" (hung) olabilir; Docker
# restart policy bunu fark etmez. Bu script health endpoint'lerini
# kontrol eder, başarısız olanları restart eder ve exited
# container'ları yeniden ayağa kaldırır.
#
# Kurulum (VPS):
#   chmod +x scripts/health-watchdog.sh
#   ./scripts/install-watchdog.sh
#
# Manuel:
#   ./scripts/health-watchdog.sh
# =============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOG_DIR="${WATCHDOG_LOG_DIR:-/var/log/ecommerce}"
LOG_FILE="${LOG_DIR}/watchdog.log"
COMPOSE=(docker compose -f docker-compose.yml)

mkdir -p "$LOG_DIR" 2>/dev/null || {
  LOG_DIR="$ROOT/logs"
  mkdir -p "$LOG_DIR"
  LOG_FILE="$LOG_DIR/watchdog.log"
}

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Host port -> container name (docker-compose container_name)
# Format: URL|container
CHECKS=(
  "http://127.0.0.1:8001/health|api-gateway"
  "http://127.0.0.1:3000/|ecommerce-web"
  "http://127.0.0.1:5001/health|identity-api"
  "http://127.0.0.1:5002/health|catalog-api"
  "http://127.0.0.1:5038/health|basket-api"
  "http://127.0.0.1:5059/health|order-api"
)

restart_container() {
  local name="$1"
  log "RESTART: $name"
  docker restart "$name" >>"$LOG_FILE" 2>&1 || log "FAIL restart $name"
}

# 1) Exited / dead compose servislerini geri getir
log "ensure stack up"
"${COMPOSE[@]}" up -d --remove-orphans >>"$LOG_FILE" 2>&1 || log "compose up uyarısı"

# 2) Docker unhealthy işaretli container'lar
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  log "UNHEALTHY: $name"
  restart_container "$name"
done < <(docker ps --filter "health=unhealthy" --format '{{.Names}}' 2>/dev/null || true)

# 3) HTTP health kontrolleri (hung process yakalar)
for entry in "${CHECKS[@]}"; do
  url="${entry%%|*}"
  name="${entry##*|}"

  if ! docker ps --format '{{.Names}}' | grep -qx "$name"; then
    log "MISSING: $name — compose up denenecek"
    "${COMPOSE[@]}" up -d "$name" >>"$LOG_FILE" 2>&1 || true
    continue
  fi

  code="$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 8 "$url" || echo 000)"
  if [[ "$code" != "200" && "$code" != "301" && "$code" != "302" && "$code" != "307" && "$code" != "308" ]]; then
    log "HTTP $code for $url ($name)"
    restart_container "$name"
    sleep 2
  fi
done

log "watchdog OK"
