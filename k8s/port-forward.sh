#!/bin/bash
# =============================================================
#  Port Forward Scripti (Debug / Geliştirme Araçları)
# =============================================================
# Ingress Controller aktifken frontend ve API erişimi için
# port-forward'a GEREK YOKTUR. Tarayıcıdan doğrudan erişin:
#
#   Frontend:       http://e-commerce.local
#   API Gateway:    http://e-commerce.local/api/
#   Seq:            http://seq.e-commerce.local
#   RabbitMQ:       http://rabbitmq.e-commerce.local
#   Jaeger:         http://jaeger.e-commerce.local
#
# Bu script sadece debug/geliştirme araçları için port-forward açar:
#   - PostgreSQL (DBeaver vb. araçlarla doğrudan erişim)
#   - Redis (redis-cli ile doğrudan erişim)
#
# İsteğe bağlı: Tüm portları açmak için (Ingress olmadan çalışmak):
#   ./k8s/port-forward.sh --all
#
# Kullanım:
#   chmod +x k8s/port-forward.sh
#   ./k8s/port-forward.sh          # Sadece debug portları
#   ./k8s/port-forward.sh --all    # Tüm portlar (Ingress'siz mod)
#
# Durdurmak için: Ctrl+C
# =============================================================

NAMESPACE="ecommerce"

# Onceki port-forward islemlerini temizle
cleanup() {
  echo ""
  echo "Port-forward durduruluyor..."
  kill $(jobs -p) 2>/dev/null
  echo "Tum port-forward islemleri durduruldu."
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "============================================="
echo "  Port Forward Baslatiliyor..."
echo "============================================="
echo ""

# Tum podlarin hazir olmasini bekle
echo "Podlarin hazir olmasi bekleniyor..."
kubectl wait --namespace=$NAMESPACE \
  --for=condition=ready pod \
  --all \
  --timeout=300s 2>/dev/null || echo "(Bazi podlar henuz hazir degil)"
echo ""

echo "Port-forward baglantilari kuruluyor:"
echo ""

if [ "$1" = "--all" ]; then
  # ==========================================
  #  TUM PORTLAR (Ingress olmadan çalışmak için)
  # ==========================================
  echo "  [MOD: Tum Portlar - Ingress'siz]"
  echo ""

  # Frontend: localhost:3000
  echo "  [Frontend]         http://localhost:3000"
  kubectl port-forward svc/ecommerce-web 3000:3000 -n $NAMESPACE > /dev/null 2>&1 &

  # API Gateway: localhost:8000
  echo "  [API Gateway]      http://localhost:8000"
  kubectl port-forward svc/api-gateway 8000:8080 -n $NAMESPACE > /dev/null 2>&1 &

  # Order API (SignalR hub için)
  echo "  [Order API]        http://localhost:5059 (SignalR)"
  kubectl port-forward svc/order-api 5059:8080 -n $NAMESPACE > /dev/null 2>&1 &

  # RabbitMQ Management: localhost:15672
  echo "  [RabbitMQ Panel]   http://localhost:15672  (guest/guest)"
  kubectl port-forward svc/rabbitmq 15672:15672 -n $NAMESPACE > /dev/null 2>&1 &

  # Seq UI: localhost:5340
  echo "  [Seq Loglama]      http://localhost:5340"
  kubectl port-forward svc/ecommerce-seq 5340:80 -n $NAMESPACE > /dev/null 2>&1 &

  # Jaeger UI: localhost:16686
  echo "  [Jaeger Tracing]   http://localhost:16686"
  kubectl port-forward svc/jaeger 16686:16686 -n $NAMESPACE > /dev/null 2>&1 &
fi

# ==========================================
#  DEBUG PORTLARI (her zaman açılır)
# ==========================================

# PostgreSQL: localhost:5436
echo "  [PostgreSQL]       localhost:5436"
kubectl port-forward svc/postgres-db 5436:5432 -n $NAMESPACE > /dev/null 2>&1 &

# Redis: localhost:6379
echo "  [Redis]            localhost:6379"
kubectl port-forward svc/redis-db 6379:6379 -n $NAMESPACE > /dev/null 2>&1 &

echo ""
echo "============================================="
if [ "$1" = "--all" ]; then
  echo "  Tum portlar aktif! (Ctrl+C ile durdurun)"
  echo "============================================="
  echo ""
  echo "  Frontend:   http://localhost:3000"
  echo "  API:        http://localhost:8000"
else
  echo "  Debug portlari aktif! (Ctrl+C ile durdurun)"
  echo "============================================="
  echo ""
  echo "  Ingress uzerinden erisin:"
  echo "    Frontend:       http://e-commerce.local"
  echo "    API:            http://e-commerce.local/api/"
  echo "    Seq:            http://seq.e-commerce.local"
  echo "    RabbitMQ:       http://rabbitmq.e-commerce.local"
  echo "    Jaeger:         http://jaeger.e-commerce.local"
  echo ""
  echo "  Debug portlari:"
  echo "    PostgreSQL:     localhost:5434"
  echo "    Redis:          localhost:6379"
fi
echo ""

# Arka plan islemlerini bekle
wait
