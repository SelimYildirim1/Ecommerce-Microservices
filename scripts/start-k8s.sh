#!/bin/bash
# =============================================================
#  Kubernetes ile Servisleri Baslat
# =============================================================
# 1. Docker imajlarini derler
# 2. K8s'e deploy eder
# 3. Port-forward baslatir (ayri terminalda calistirin)
#
# Kullanim:
#   ./scripts/start-k8s.sh
#
# Port-forward icin (ayri bir terminalde):
#   ./k8s/port-forward.sh
# =============================================================

set -e

cd "$(dirname "$0")/.."

echo "============================================="
echo "  Kubernetes ile Baslatiliyor..."
echo "============================================="
echo ""

# 1. Imajlari derle
echo "[1/2] Docker imajlari derleniyor..."
./k8s/build-images.sh
echo ""

# 2. Deploy
echo "[2/2] Kubernetes'e deploy ediliyor..."
./k8s/deploy.sh
echo ""

# Podlarin hazir olmasini bekle
echo "Podlarin hazir olmasi bekleniyor..."
kubectl wait --namespace=ecommerce --for=condition=ready pod --all --timeout=300s 2>/dev/null || true
echo ""

echo "============================================="
echo "  Deploy tamamlandi!"
echo "============================================="
echo ""
echo "  Tarayicida acin: http://e-commerce.local"
echo ""
echo "  Diger adresler:"
echo "    Seq Loglama:    http://seq.e-commerce.local"
echo "    RabbitMQ:       http://rabbitmq.e-commerce.local"
echo ""
echo "  Debug portlari icin (opsiyonel):"
echo "    ./k8s/port-forward.sh"
echo ""
echo "  Durdurmak icin: ./k8s/teardown.sh"
echo ""
