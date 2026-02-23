#!/bin/bash
# =============================================================
#  Kubernetes Kaynaklarını Silme Scripti
# =============================================================
# Bu script tum K8s kaynaklarini temizler.
# Ingress Controller korunur (diger projeler de kullanabilir).
#
# Ingress Controller'i da silmek icin:
#   ./k8s/teardown.sh --all
#
# Kullanim:
#   chmod +x k8s/teardown.sh
#   ./k8s/teardown.sh
# =============================================================

echo "============================================="
echo "  Kubernetes Kaynaklari Siliniyor..."
echo "============================================="
echo ""

echo "[1/7] HPA (Otomatik Ölçekleme) siliniyor..."
kubectl delete -f k8s/hpa.yaml --ignore-not-found 2>/dev/null
echo ""

echo "[2/7] Ingress kurallari siliniyor..."
kubectl delete -f k8s/ingress.yaml --ignore-not-found 2>/dev/null
echo ""

echo "[3/7] Frontend siliniyor..."
kubectl delete -f k8s/apps-frontend.yaml --ignore-not-found 2>/dev/null
echo ""

echo "[4/7] Monitoring siliniyor (Prometheus & Grafana)..."
kubectl delete -f k8s/monitoring.yaml --ignore-not-found 2>/dev/null
echo ""

echo "[5/7] Backend servisleri siliniyor..."
kubectl delete -f k8s/apps-backend.yaml --ignore-not-found 2>/dev/null
echo ""

echo "[6/7] Altyapi servisleri siliniyor..."
kubectl delete -f k8s/infrastructure.yaml --ignore-not-found 2>/dev/null
echo ""

echo "[7/7] Namespace siliniyor..."
kubectl delete namespace ecommerce --ignore-not-found 2>/dev/null
echo ""

# Ingress Controller'i da sil (--all parametresi ile)
if [ "$1" = "--all" ]; then
  echo "[EKSTRA] Nginx Ingress Controller siliniyor..."
  kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml --ignore-not-found 2>/dev/null
  echo ""
fi

echo "============================================="
echo "  Tum kaynaklar basariyla silindi!"
echo "============================================="
echo ""
echo "  Not: Ingress Controller korundu (diger projeler kullanabilir)."
echo "  Onu da silmek icin: ./k8s/teardown.sh --all"
echo ""
