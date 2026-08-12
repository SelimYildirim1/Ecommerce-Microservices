#!/bin/bash
# =============================================================
#  Docker Compose ile Servisleri Baslat
# =============================================================
# Tum servisleri (altyapi + backend + frontend) Docker ile ayaga kaldirir.
#
# Kullanim:
#   ./scripts/start-docker.sh              # Lite (onerilen) — monitoring YOK
#   ./scripts/start-docker.sh --full       # Seq + Jaeger + Prometheus + Grafana dahil
#   ./scripts/start-docker.sh --no-detach  # Oneki planda, loglari goster
# =============================================================

cd "$(dirname "$0")/.."

DETACH=true
PROFILE_ARGS=()
MODE="lite"

for arg in "$@"; do
  case "$arg" in
    --full|-F)
      PROFILE_ARGS=(--profile monitoring)
      MODE="full"
      ;;
    --no-detach|-f)
      DETACH=false
      ;;
    --lite|-L)
      MODE="lite"
      ;;
    *)
      echo "Bilinmeyen arguman: $arg"
      echo "Kullanim: ./scripts/start-docker.sh [--lite|--full] [--no-detach]"
      exit 1
      ;;
  esac
done

echo "============================================="
echo "  Docker Compose baslatiliyor ($MODE)..."
echo "============================================="
echo ""

if [[ "$DETACH" == "false" ]]; then
  docker compose "${PROFILE_ARGS[@]}" up
else
  docker compose "${PROFILE_ARGS[@]}" up -d
  echo ""
  echo "============================================="
  echo "  Servisler baslatildi! ($MODE)"
  echo "============================================="
  echo ""
  echo "  Frontend:     http://localhost:3000"
  echo "  Admin Panel:  http://localhost:3002"
  echo "  API Gateway:  http://localhost:8001"
  echo "  RabbitMQ:     http://localhost:15672 (guest/guest)"
  echo "  MailHog:      http://localhost:8025 (giden e-postalar)"
  echo ""
  echo "  Hot-reload (dev): docker compose -f docker-compose.yml -f docker-compose.dev.yml up ecommerce.web"
  if [[ "$MODE" == "full" ]]; then
    echo "  Seq:          http://localhost:5340"
    echo "  Jaeger:       http://localhost:16686"
    echo "  Prometheus:   http://localhost:9090"
    echo "  Grafana:      http://localhost:3001 (admin/admin)"
  else
    echo ""
    echo "  Monitoring kapali (RAM tasarrufu)."
    echo "  Acmak icin: ./scripts/start-docker.sh --full"
  fi
  echo ""
  echo "  Durdurmak icin: ./scripts/stop-docker.sh"
  echo "  Saglik kontrol: ./scripts/smoke-health.sh"
  echo "  Self-heal cron: ./scripts/install-watchdog.sh  (VPS)"
  echo ""
fi
