#!/bin/bash
# =============================================================
#  Docker Compose ile Servisleri Baslat
# =============================================================
# Tum servisleri (altyapi + backend + frontend) Docker ile ayaga kaldirir.
#
# Kullanim:
#   ./scripts/start-docker.sh        # Arka planda (-d)
#   ./scripts/start-docker.sh --no-detach   # Oneki planda, loglari goster
# =============================================================

cd "$(dirname "$0")/.."

echo "============================================="
echo "  Docker Compose ile Baslatiliyor..."
echo "============================================="
echo ""

if [[ "$1" == "--no-detach" ]] || [[ "$1" == "-f" ]]; then
  docker compose up
else
  docker compose up -d
  echo ""
  echo "============================================="
  echo "  Servisler baslatildi!"
  echo "============================================="
  echo ""
  echo "  Frontend:     http://localhost:3000"
  echo "  API Gateway:  http://localhost:8000"
  echo "  RabbitMQ:     http://localhost:15672 (guest/guest)"
  echo "  Seq:          http://localhost:5340"
  echo ""
  echo "  Durdurmak icin: docker compose down"
  echo ""
fi
