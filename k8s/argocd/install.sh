#!/bin/bash
# =============================================================
#  ArgoCD Kurulum Scripti
# =============================================================
# Bu script ArgoCD'yi Kubernetes cluster'ına kurar ve
# ecommerce uygulamasını izlemeye başlar.
#
# Kullanım:
#   chmod +x k8s/argocd/install.sh
#   ./k8s/argocd/install.sh
# =============================================================

set -e

echo "============================================="
echo "  ArgoCD Kuruluyor..."
echo "============================================="
echo ""

# 1. ArgoCD namespace oluştur
echo "[1/5] ArgoCD namespace oluşturuluyor..."
kubectl create namespace argocd 2>/dev/null || echo "      Namespace zaten mevcut."

# 2. ArgoCD kur
echo "[2/5] ArgoCD yükleniyor..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 3. ArgoCD'nin hazır olmasını bekle
echo "[3/5] ArgoCD'nin hazır olması bekleniyor..."
kubectl wait --namespace=argocd \
  --for=condition=ready pod \
  -l app.kubernetes.io/name=argocd-server \
  --timeout=180s 2>/dev/null || echo "      (ArgoCD henüz hazır değil, biraz bekleyin...)"

# 4. Ecommerce Application tanımını uygula
echo "[4/5] Ecommerce ArgoCD Application oluşturuluyor..."
kubectl apply -f k8s/argocd/application.yaml

# 5. Admin şifresini al
echo "[5/5] ArgoCD admin şifresi alınıyor..."
echo ""

ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" 2>/dev/null | base64 -d)

echo "============================================="
echo "  ArgoCD Kurulumu Tamamlandı!"
echo "============================================="
echo ""
echo "  Dashboard Erişimi:"
echo "    kubectl port-forward svc/argocd-server -n argocd 8443:443"
echo "    Tarayıcıda aç: https://localhost:8443"
echo ""
echo "  Giriş Bilgileri:"
echo "    Kullanıcı: admin"
echo "    Şifre:     $ARGOCD_PASSWORD"
echo ""
echo "  ArgoCD CLI (opsiyonel):"
echo "    brew install argocd"
echo "    argocd login localhost:8443 --username admin --password $ARGOCD_PASSWORD --insecure"
echo ""
echo "  Ecommerce uygulamasının durumunu görmek için:"
echo "    argocd app get ecommerce"
echo "    argocd app sync ecommerce"
echo ""
