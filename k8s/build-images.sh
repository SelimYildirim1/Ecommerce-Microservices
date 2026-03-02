#!/bin/bash
# =============================================================
#  Docker İmajlarını Derleme Scripti
# =============================================================
# Bu script tüm mikroservis ve frontend imajlarını derler.
# OrbStack/Docker Desktop K8s ile lokalde build edilen imajlar
# otomatik olarak Kubernetes tarafından görülür.
#
# Kullanım:
#   chmod +x k8s/build-images.sh
#   ./k8s/build-images.sh
# =============================================================

set -e

# Proje kök dizinine git (script'in bulunduğu yerden bir üst dizin)
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo "============================================="
echo "  Docker Imajlari Derleniyor..."
echo "  Proje Dizini: $PROJECT_ROOT"
echo "============================================="
echo ""

# Sayac
TOTAL=8
CURRENT=0

build_image() {
  local name=$1
  local dockerfile=$2
  local context=$3
  CURRENT=$((CURRENT + 1))

  echo "[$CURRENT/$TOTAL] $name derleniyor..."
  if docker build -t "$name:latest" -f "$dockerfile" "$context" > /dev/null 2>&1; then
    echo "         -> Basarili!"
  else
    echo "         -> HATA! $name derlenemedi."
    echo "         Detayli log icin calistirin:"
    echo "         docker build -t $name:latest -f $dockerfile $context"
    exit 1
  fi
}

# -------------------- BACKEND SERVİSLERİ --------------------
# .NET servisleri icin context = proje kok dizini (Core.Shared referansi icin)

build_image "identity-api" \
  "src/Services/Identity.API/Dockerfile" \
  "$PROJECT_ROOT"

build_image "catalog-api" \
  "src/Services/Catalog.API/Dockerfile" \
  "$PROJECT_ROOT"

build_image "basket-api" \
  "src/Services/Basket.API/Dockerfile" \
  "$PROJECT_ROOT"

build_image "order-api" \
  "src/Services/Order.API/Dockerfile" \
  "$PROJECT_ROOT"

build_image "payment-api" \
  "src/Services/Payment.API/Dockerfile" \
  "$PROJECT_ROOT"

build_image "api-gateway" \
  "src/API.Gateway/Dockerfile" \
  "$PROJECT_ROOT"

build_image "shopping-aggregator" \
  "src/Shopping.Aggregator/Dockerfile" \
  "$PROJECT_ROOT"

# -------------------- FRONTEND --------------------
# Frontend icin context = frontend dizini
# Ingress kullanildiginda:
#   NEXT_PUBLIC_API_GATEWAY_URL = http://e-commerce.local/api
#   NEXT_PUBLIC_SIGNALR_URL     = http://e-commerce.local/signalr
# Docker Compose (port-forward) modunda:
#   NEXT_PUBLIC_API_GATEWAY_URL = http://localhost:8000
#   NEXT_PUBLIC_SIGNALR_URL     = http://localhost:5059

# Varsayilan: Ingress modu (Kubernetes)
FRONTEND_API_URL="${NEXT_PUBLIC_API_GATEWAY_URL:-http://e-commerce.local/api}"
FRONTEND_SIGNALR_URL="${NEXT_PUBLIC_SIGNALR_URL:-http://e-commerce.local/signalr}"

echo "[$((CURRENT + 1))/$TOTAL] ecommerce-web derleniyor..."
echo "         API URL: $FRONTEND_API_URL"
echo "         SignalR URL: $FRONTEND_SIGNALR_URL"
if docker build -t "ecommerce-web:latest" \
  --build-arg NEXT_PUBLIC_API_GATEWAY_URL="$FRONTEND_API_URL" \
  --build-arg NEXT_PUBLIC_SIGNALR_URL="$FRONTEND_SIGNALR_URL" \
  "src/Clients/ecommerce-web" > /dev/null 2>&1; then
  echo "         -> Basarili!"
else
  echo "         -> HATA! ecommerce-web derlenemedi."
  echo "         Detayli log icin calistirin:"
  echo "         docker build -t ecommerce-web:latest --build-arg NEXT_PUBLIC_API_GATEWAY_URL=$FRONTEND_API_URL --build-arg NEXT_PUBLIC_SIGNALR_URL=$FRONTEND_SIGNALR_URL src/Clients/ecommerce-web"
  exit 1
fi

echo ""
echo "============================================="
echo "  Tum imajlar basariyla derlendi!"
echo "============================================="
echo ""
echo "Derlenen imajlar:"
docker images --format "  {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep -E "^  (identity-api|catalog-api|basket-api|order-api|payment-api|api-gateway|ecommerce-web)"
echo ""
echo "Sonraki adim: ./k8s/deploy.sh"
