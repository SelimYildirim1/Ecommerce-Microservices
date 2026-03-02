#!/bin/bash
# =============================================================
#  Kubernetes Deploy Scripti
# =============================================================
# Bu script tum servisleri Kubernetes'e deploy eder.
# Sira: Ingress Controller -> Altyapi -> Backend -> Frontend -> Ingress Rules
#
# Kullanim:
#   chmod +x k8s/deploy.sh
#   ./k8s/deploy.sh
#
# On kosul: Imajlarin onceden build edilmis olmasi gerekir:
#   ./k8s/build-images.sh
# =============================================================

set -e

cd "$(dirname "$0")/.."

echo "============================================="
echo "  Kubernetes'e Deploy Ediliyor..."
echo "============================================="
echo ""

# -------------------- 0. NGINX INGRESS CONTROLLER --------------------
echo "[0/4] Nginx Ingress Controller kontrol ediliyor..."

# Ingress Controller zaten kuruluysa tekrar kurmaya gerek yok
if kubectl get namespace ingress-nginx > /dev/null 2>&1 && \
   kubectl get deployment -n ingress-nginx ingress-nginx-controller > /dev/null 2>&1; then
  echo "      Nginx Ingress Controller zaten kurulu. Atlanıyor."
else
  echo "      Nginx Ingress Controller kuruluyor..."
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml
  echo ""
  echo "      Ingress Controller'in hazir olmasi bekleniyor..."
  kubectl wait --namespace=ingress-nginx \
    --for=condition=ready pod \
    -l app.kubernetes.io/component=controller \
    --timeout=120s 2>/dev/null || echo "      (Ingress Controller henuz hazir degil, devam ediliyor...)"
fi
echo ""

# -------------------- 1. ALTYAPI --------------------
echo "[1/4] Altyapi servisleri kuruluyor..."
echo "      (PostgreSQL, Redis, RabbitMQ, Seq, Jaeger)"
kubectl apply -f k8s/infrastructure.yaml
echo ""

# Altyapinin hazir olmasini bekle
echo "      PostgreSQL'in hazir olmasi bekleniyor..."
kubectl wait --namespace=ecommerce \
  --for=condition=ready pod \
  -l app=postgres-db \
  --timeout=120s 2>/dev/null || echo "      (PostgreSQL henuz hazir degil, devam ediliyor...)"

echo "      Redis'in hazir olmasi bekleniyor..."
kubectl wait --namespace=ecommerce \
  --for=condition=ready pod \
  -l app=redis-db \
  --timeout=60s 2>/dev/null || echo "      (Redis henuz hazir degil, devam ediliyor...)"

echo "      RabbitMQ'nun hazir olmasi bekleniyor..."
kubectl wait --namespace=ecommerce \
  --for=condition=ready pod \
  -l app=rabbitmq \
  --timeout=120s 2>/dev/null || echo "      (RabbitMQ henuz hazir degil, devam ediliyor...)"

echo "      Jaeger'in hazir olmasi bekleniyor..."
kubectl wait --namespace=ecommerce \
  --for=condition=ready pod \
  -l app=jaeger \
  --timeout=60s 2>/dev/null || echo "      (Jaeger henuz hazir degil, devam ediliyor...)"

echo ""

# -------------------- 2. BACKEND --------------------
echo "[2/7] Backend servisleri kuruluyor..."
echo "      (Identity, Catalog, Basket, Order, Payment, API Gateway)"
kubectl apply -f k8s/apps-backend.yaml
echo ""

# -------------------- 3. FRONTEND --------------------
echo "[3/7] Frontend kuruluyor..."
echo "      (ecommerce-web)"
kubectl apply -f k8s/apps-frontend.yaml
echo ""

# -------------------- 4. MONİTORİNG --------------------
echo "[4/7] Monitoring kuruluyor..."
echo "      (Prometheus & Grafana)"
kubectl apply -f k8s/monitoring.yaml
echo ""

# -------------------- 5. METRICS SERVER --------------------
echo "[5/7] Metrics Server kontrol ediliyor..."
if kubectl get deployment metrics-server -n kube-system > /dev/null 2>&1; then
  echo "      Metrics Server zaten kurulu. Atlanıyor."
else
  echo "      Metrics Server kuruluyor (HPA için gerekli)..."
  kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
  # Lokal ortamda TLS sertifika doğrulamasını devre dışı bırak
  kubectl patch deployment metrics-server -n kube-system \
    --type='json' \
    -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]' 2>/dev/null || true
  echo "      Metrics Server'ın hazır olması bekleniyor..."
  kubectl wait --namespace=kube-system \
    --for=condition=ready pod \
    -l k8s-app=metrics-server \
    --timeout=120s 2>/dev/null || echo "      (Metrics Server henüz hazır değil, devam ediliyor...)"
fi
echo ""

# -------------------- 6. HPA (Otomatik Ölçekleme) --------------------
echo "[6/7] HPA (Horizontal Pod Autoscaler) kuruluyor..."
echo "      (Order, Catalog, Basket, API Gateway otomatik ölçekleme)"
kubectl apply -f k8s/hpa.yaml
echo ""

# -------------------- 7. INGRESS RULES --------------------
echo "[7/7] Ingress kurallari uygulanıyor..."
echo "      (e-commerce.local routing)"
kubectl apply -f k8s/ingress.yaml
echo ""

# -------------------- /etc/hosts KONTROLU --------------------
echo "============================================="
echo "  Deploy Tamamlandi!"
echo "============================================="
echo ""

# /etc/hosts kontrolu
HOSTS_ENTRY="127.0.0.1  e-commerce.local seq.e-commerce.local rabbitmq.e-commerce.local prometheus.e-commerce.local grafana.e-commerce.local jaeger.e-commerce.local"
if grep -q "jaeger.e-commerce.local" /etc/hosts 2>/dev/null; then
  echo "  /etc/hosts: e-commerce.local zaten tanimli."
else
  echo "  UYARI: /etc/hosts dosyasina asagidaki satiri ekleyin:"
  echo ""
  echo "    sudo sh -c 'echo \"$HOSTS_ENTRY\" >> /etc/hosts'"
  echo ""
fi

echo ""
echo "Pod durumlarini gormek icin:"
echo "  kubectl get pods -n ecommerce"
echo ""
echo "Tum podlarin hazir olmasini beklemek icin:"
echo "  kubectl wait --namespace=ecommerce --for=condition=ready pod --all --timeout=300s"
echo ""
echo "HPA durumunu gormek icin:"
echo "  kubectl get hpa -n ecommerce"
echo ""
echo "Ingress durumunu gormek icin:"
echo "  kubectl get ingress -n ecommerce"
echo ""
echo "============================================="
echo "  Erisim Adresleri (Ingress)"
echo "============================================="
echo ""
echo "  Frontend:         http://e-commerce.local"
echo "  API Gateway:      http://e-commerce.local/api/"
echo "  SignalR Hub:      http://e-commerce.local/signalr/"
echo "  Seq Loglama:      http://seq.e-commerce.local"
echo "  RabbitMQ Panel:   http://rabbitmq.e-commerce.local  (guest/guest)"
echo "  Prometheus:       http://prometheus.e-commerce.local"
echo "  Grafana:          http://grafana.e-commerce.local   (admin/admin)"
echo "  Jaeger Tracing:   http://jaeger.e-commerce.local"
echo ""
echo "  Debug icin port-forward (opsiyonel):"
echo "    ./k8s/port-forward.sh"
echo ""
