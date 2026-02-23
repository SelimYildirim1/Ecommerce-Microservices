# 🏭 CI/CD Pipeline — Fabrika Otomasyonu

> **Amaç:** Kod push edildiğinde test, build ve deploy işlemlerinin otomatik gerçekleşmesi.

---

## Şu Anki Durum vs Hedef

| | Manuel (Şimdi) | Otomatik (CI/CD) |
|---|---|---|
| **Test** | `dotnet test` elle çalıştır | GitHub Actions otomatik çalıştırır |
| **Build** | `docker build` elle yaz | GitHub Actions her servis için paralel build |
| **Push** | Lokal imaj, registry yok | GitHub Container Registry'ye otomatik push |
| **Deploy** | `kubectl apply` elle yaz | ArgoCD otomatik algılar ve deploy eder |
| **Rollback** | Hangi versiyon çalışıyordu? 🤔 | ArgoCD dashboard'dan tek tıkla geri al |

---

## Mimari

```
  Geliştirici
      │
      │ git push (main branch)
      ▼
┌─────────────────────────────────────────────────┐
│              GitHub Actions (CI)                 │
│                                                  │
│  1. 🧪 Test     → dotnet test (tüm solution)    │
│  2. 🐳 Build    → 7 Docker imajı paralel build  │
│  3. 📦 Push     → ghcr.io registry'ye push      │
│  4. 📝 Güncelle → k8s/ YAML'lardaki image tag   │
└──────────────────────┬──────────────────────────┘
                       │
                       │ k8s/ YAML'lar değişti
                       ▼
┌─────────────────────────────────────────────────┐
│              ArgoCD (CD)                         │
│                                                  │
│  1. 👀 İzle   → k8s/ klasörünü sürekli izler    │
│  2. 🔍 Algıla → Yeni image tag'i fark eder      │
│  3. 🚀 Deploy → Kubernetes'e otomatik apply      │
│  4. 🔄 Heal   → Manuel değişiklik? Geri al!     │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│           Kubernetes Cluster                     │
│                                                  │
│  Yeni pod'lar rolling update ile başlar          │
│  Eski pod'lar sıfır kesinti ile kapanır          │
└─────────────────────────────────────────────────┘
```

---

## Dosya Yapısı

```
.github/
  workflows/
    ci-cd.yml              # GitHub Actions pipeline tanımı

k8s/
  argocd/
    application.yaml       # ArgoCD'ye "bu repo'yu izle" diyen tanım
    install.sh             # ArgoCD kurulum scripti
  apps-backend.yaml        # (image tag'leri CI tarafından güncellenir)
  apps-frontend.yaml       # (image tag'leri CI tarafından güncellenir)
  ...
```

---

## GitHub Actions Pipeline Detayı

Pipeline 3 aşamadan oluşur:

### Aşama 1: Test 🧪

```yaml
# Her push ve PR'da çalışır
- dotnet restore
- dotnet build --configuration Release
- dotnet test
```

Test başarısız olursa pipeline durur. Hiçbir imaj build edilmez, hiçbir deploy yapılmaz.

### Aşama 2: Build & Push 🐳

Test geçtikten sonra, sadece `main` branch'e push'ta çalışır.

7 servis **paralel** olarak build edilir (matrix strategy):
- identity-api, catalog-api, basket-api, order-api, payment-api, api-gateway, ecommerce-web

Her imaj iki tag ile push edilir:
- `ghcr.io/<kullanıcı>/ecommerce/<servis>:<commit-sha>` (benzersiz, rollback için)
- `ghcr.io/<kullanıcı>/ecommerce/<servis>:latest` (en güncel)

### Aşama 3: Manifest Güncelle 📝

Build bittikten sonra:
1. `k8s/apps-backend.yaml` ve `k8s/apps-frontend.yaml` içindeki `image:` satırları yeni tag ile güncellenir
2. `imagePullPolicy: Never` → `imagePullPolicy: Always` olarak değiştirilir
3. Değişiklik commit edilip push edilir

Bu commit ArgoCD'yi tetikler.

---

## ArgoCD Detayı

### Nedir?

ArgoCD bir **GitOps** aracıdır. "Git repo'sundaki YAML'lar = Kubernetes'teki gerçek durum" prensibini uygular.

### Ne Yapar?

| Özellik | Açıklama |
|---------|----------|
| **Otomatik Sync** | k8s/ klasöründe değişiklik olunca otomatik deploy |
| **Self-Heal** | Biri `kubectl` ile manuel değişiklik yaparsa geri alır |
| **Prune** | Repo'dan silinen kaynakları K8s'ten de siler |
| **Dashboard** | Tüm servislerin durumunu görsel olarak gösterir |
| **Rollback** | Önceki versiyona tek tıkla dönüş |
| **Diff** | Deploy öncesi "ne değişecek?" gösterir |

### Kurulum

```bash
# ArgoCD'yi kur ve ecommerce uygulamasını tanımla
chmod +x k8s/argocd/install.sh
./k8s/argocd/install.sh

# Dashboard'a eriş
kubectl port-forward svc/argocd-server -n argocd 8443:443

# Tarayıcıda aç: https://localhost:8443
# Kullanıcı: admin
# Şifre: (install.sh çıktısında gösterilir)
```

### ⚠️ Önemli: Repo URL'sini Güncelle

`k8s/argocd/application.yaml` dosyasındaki `repoURL` alanını kendi GitHub repo adresinle değiştir:

```yaml
source:
  repoURL: https://github.com/SelimYildirim1/Ecommerce-Microservices.git
```

---

## Tam Akış Senaryosu

Diyelim ki Catalog API'ye yeni bir endpoint ekledin:

1. **Kod yaz** → `src/Services/Catalog.API/Controllers/ProductsController.cs`
2. **Commit & Push** → `git push origin main`
3. **GitHub Actions tetiklenir:**
   - ✅ Test geçti
   - ✅ `catalog-api` imajı build edildi (diğer 6 servis de paralel)
   - ✅ `ghcr.io/<user>/ecommerce/catalog-api:abc1234` olarak push edildi
   - ✅ `k8s/apps-backend.yaml` güncellendi ve commit edildi
4. **ArgoCD algılar:**
   - 👀 "apps-backend.yaml değişmiş, catalog-api image tag'i farklı"
   - 🚀 `kubectl apply` otomatik çalışır
   - 🔄 Catalog API pod'u rolling update ile yenilenir
5. **Sen kahveni içerken** canlı sistem güncellendi ☕

---

## Faydalı Komutlar

```bash
# ArgoCD dashboard'a eriş
kubectl port-forward svc/argocd-server -n argocd 8443:443

# ArgoCD uygulama durumunu gör
argocd app get ecommerce

# Manuel sync tetikle
argocd app sync ecommerce

# Önceki versiyona rollback
argocd app rollback ecommerce

# ArgoCD admin şifresini tekrar al
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# GitHub Actions loglarını görmek için
# GitHub repo → Actions sekmesi
```

---

## Güvenlik Notları

- GitHub Actions, `GITHUB_TOKEN` ile otomatik olarak ghcr.io'ya erişir (ekstra secret gerekmez)
- ArgoCD, public repo'lar için ek ayar gerektirmez
- Private repo kullanıyorsan ArgoCD'ye SSH key veya token tanımlamalısın:
  ```bash
  argocd repo add https://github.com/USER/REPO.git --username git --password <GITHUB_TOKEN>
  ```
