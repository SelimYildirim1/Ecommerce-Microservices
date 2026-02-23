# Kubernetes ile E-Commerce Projesi

Bu dokuman, e-commerce mikroservis projesinin Kubernetes uzerinde calistirilmasini adim adim aciklar.

---

## Icindekiler

1. [Genel Bakis](#genel-bakis)
2. [On Kosullar](#on-kosullar)
3. [Mimari](#mimari)
4. [Klasor Yapisi](#klasor-yapisi)
5. [Hizli Baslangic](#hizli-baslangic)
6. [Adim Adim Kurulum](#adim-adim-kurulum)
7. [Ingress Controller (Trafik Yonetimi)](#ingress-controller-trafik-yonetimi)
8. [Servis Detaylari](#servis-detaylari)
9. [Erisim Adresleri](#erisim-adresleri)
10. [Otomatik Olcekleme (HPA)](#otomatik-olcekleme-hpa---horizontal-pod-autoscaler)
11. [Faydali Komutlar](#faydali-komutlar)
12. [Sorun Giderme](#sorun-giderme)
13. [docker-compose vs Kubernetes Karsilastirma](#docker-compose-vs-kubernetes-karsilastirma)

---

## Genel Bakis

Proje, Docker Compose'a ek olarak artik Kubernetes uzerinde de calistirilabilir. Tum konfigurasyonlar `k8s/` klasorunde bulunur ve 4 ana dosyaya bolunmustur:

| Dosya | Icerik |
|-------|--------|
| `infrastructure.yaml` | PostgreSQL, Redis, RabbitMQ, Seq |
| `apps-backend.yaml` | Identity, Catalog, Basket, Order, Payment API + API Gateway |
| `apps-frontend.yaml` | Next.js Web Uygulamasi |
| `ingress.yaml` | Nginx Ingress Controller routing kurallari |

**Tasarim Karari:** Kubernetes Service isimleri, docker-compose container isimleriyle birebir eslestirilmistir. Bu sayede `ocelot.json`, `appsettings.json` ve uygulama kodunda **hicbir degisiklik gerekmez**.

---

## On Kosullar

- **OrbStack** (onerilen) veya **Docker Desktop** kurulu olmali
- OrbStack/Docker Desktop icerisinde **Kubernetes** aktif edilmis olmali
- `kubectl` CLI kurulu olmali
- `docker` CLI kurulu olmali

### Kubernetes'i Aktif Etme

**OrbStack:**
OrbStack > Settings > Kubernetes > Enable Kubernetes

**Docker Desktop:**
Docker Desktop > Settings > Kubernetes > Enable Kubernetes

Kontrol:
```bash
kubectl cluster-info
kubectl get nodes
```

---

## Mimari

```
                         [Tarayici]
                             |
                    e-commerce.local (port 80)
                             |
                  +---------------------+
                  | Nginx Ingress       |
                  | Controller          |
                  +---------------------+
                    |        |        |
            /       |  /api/*  | /signalr/*
            |        |        |
      +-----------+  |  +-----------+
      |  Frontend |  |  | Order API |
      | (Next.js) |  |  | (SignalR) |
      +-----------+  |  +-----------+
                     |
              +-------------+
              | API Gateway |
              |  (Ocelot)   |
              +-------------+
                     |
        +------------+------------+------------+------------+
        |            |            |            |            |
  +-----------++-----------++-----------++-----------++-----------+
  | Identity  || Catalog   || Basket    || Order     || Payment   |
  |   API     ||   API     ||   API     ||   API     ||   API     |
  +-----------++-----------++-----------++-----------++-----------+
        |            |            |            |            |
  +-----+-----+     |      +-----+      +-----+      +-----+
  |           |     |      |            |            |
+--------+ +--------+ +--------+ +--------+ +--------+
|Postgres| |Postgres| | Redis  | |Postgres| |RabbitMQ|
|IdentityDb|CatalogDb|         | | OrderDb |         |
+--------+ +--------+ +--------+ +--------+ +--------+
                                                  |
                                            +----------+
                                            |   Seq    |
                                            | (Loglar) |
                                            +----------+

Ek subdomain routing:
  seq.e-commerce.local      -> Seq Dashboard
  rabbitmq.e-commerce.local -> RabbitMQ Management UI
```

### Ingress Routing Kurallari

| URL | Hedef Servis | Aciklama |
|-----|-------------|----------|
| `e-commerce.local/` | ecommerce-web:3000 | Frontend (Next.js) |
| `e-commerce.local/api/*` | api-gateway:8080 | API Gateway (/api/ prefix strip edilir) |
| `e-commerce.local/signalr/*` | order-api:8080 | SignalR Hub (/signalr/ prefix strip edilir) |
| `seq.e-commerce.local` | ecommerce-seq:80 | Seq Loglama Dashboard |
| `rabbitmq.e-commerce.local` | rabbitmq:15672 | RabbitMQ Management Panel |

### Kubernetes Namespace: `ecommerce`

Tum kaynaklar `ecommerce` namespace'i altinda olusturulur.

---

## Klasor Yapisi

```
k8s/
  infrastructure.yaml   # Altyapi: PostgreSQL, Redis, RabbitMQ, Seq
  apps-backend.yaml     # Backend: 5 API + Gateway
  apps-frontend.yaml    # Frontend: Next.js
  monitoring.yaml       # Monitoring: Prometheus & Grafana
  hpa.yaml              # HPA: Otomatik olcekleme (Order, Catalog, Basket, Gateway)
  ingress.yaml          # Ingress: Nginx routing kurallari
  build-images.sh       # Tum Docker imajlarini derler
  deploy.sh             # Ingress Controller + Metrics Server + K8s deploy
  port-forward.sh       # Debug portlari (PostgreSQL, Redis)
  teardown.sh           # Tum kaynaklari siler
```

---

## Hizli Baslangic

### 1. /etc/hosts Ayari (Bir kez yapilir)

```bash
sudo sh -c 'echo "127.0.0.1  e-commerce.local seq.e-commerce.local rabbitmq.e-commerce.local prometheus.e-commerce.local grafana.e-commerce.local" >> /etc/hosts'
```

### 2. Build ve Deploy

```bash
# 1. Imajlari derle
./k8s/build-images.sh

# 2. Kubernetes'e deploy et (Ingress Controller dahil)
./k8s/deploy.sh

# 3. Podlarin hazir olmasini bekle
kubectl wait --namespace=ecommerce --for=condition=ready pod --all --timeout=300s

# 4. Debug portlarini ac (opsiyonel - PostgreSQL/Redis erisimi)
./k8s/port-forward.sh
```

Tarayicida ac: **http://e-commerce.local**

### Durdurma

```bash
# Tum K8s kaynaklarini sil (Ingress Controller korunur)
./k8s/teardown.sh

# Ingress Controller dahil herseyi sil
./k8s/teardown.sh --all
```

---

## Adim Adim Kurulum

### Adim 1: /etc/hosts Dosyasini Guncelle

Ingress Controller yerel domain isimlerini cozumleyebilmesi icin `/etc/hosts` dosyasina ekleyin:

```bash
sudo sh -c 'echo "127.0.0.1  e-commerce.local seq.e-commerce.local rabbitmq.e-commerce.local" >> /etc/hosts'
```

Kontrol:
```bash
ping -c 1 e-commerce.local
# PING e-commerce.local (127.0.0.1) ...
```

### Adim 2: Docker Imajlarini Derle

Kubernetes, docker-compose'dan farkli olarak `build` komutu barindirmaz. Imajlarin onceden hazir olmasi gerekir.

```bash
./k8s/build-images.sh
```

Bu script su imajlari derler:

| Imaj | Kaynak | Context |
|------|--------|---------|
| `identity-api:latest` | `src/Services/Identity.API/Dockerfile` | Proje koku |
| `catalog-api:latest` | `src/Services/Catalog.API/Dockerfile` | Proje koku |
| `basket-api:latest` | `src/Services/Basket.API/Dockerfile` | Proje koku |
| `order-api:latest` | `src/Services/Order.API/Dockerfile` | Proje koku |
| `payment-api:latest` | `src/Services/Payment.API/Dockerfile` | Proje koku |
| `api-gateway:latest` | `src/API.Gateway/Dockerfile` | Proje koku |
| `ecommerce-web:latest` | `src/Clients/ecommerce-web/Dockerfile` | Frontend dizini |

Frontend imaji build sirasinda su URL'leri baked-in olarak icerir:
- `NEXT_PUBLIC_API_GATEWAY_URL=http://e-commerce.local/api`
- `NEXT_PUBLIC_SIGNALR_URL=http://e-commerce.local/signalr`

> **Not:** `imagePullPolicy: Never` kullanildiginden, K8s lokaldeki imajlari kullanir. Registry'ye push gerekmez.

### Adim 3: Deploy Et

```bash
./k8s/deploy.sh
```

Bu script sirasiyla:
1. **Nginx Ingress Controller** kurar (yoksa)
2. **Altyapi** servislerini deploy eder (PostgreSQL, Redis, RabbitMQ, Seq)
3. **Backend** servislerini deploy eder (5 API + Gateway)
4. **Frontend** deploy eder (Next.js)
5. **Ingress kurallarini** uygular (routing)

### Adim 4: Erisim

Tarayicida acin: **http://e-commerce.local**

Diger servisler:
- Seq Loglama: **http://seq.e-commerce.local**
- RabbitMQ: **http://rabbitmq.e-commerce.local** (guest/guest)

### Adim 5: Debug Portlari (Opsiyonel)

PostgreSQL ve Redis'e dogrudan erismek icin:

```bash
./k8s/port-forward.sh
```

| Servis | Adres |
|--------|-------|
| PostgreSQL | `localhost:5434` |
| Redis | `localhost:6379` |

---

## Ingress Controller (Trafik Yonetimi)

### Nedir?

Nginx Ingress Controller, Kubernetes cluster'a gelen tum HTTP/HTTPS trafikini yoneten bir "trafik polisi"dir. Tek bir giris noktasi (`e-commerce.local`) uzerinden tum servislere erisim saglar.

### Onceki Durum (Port Forward)

```
localhost:3000  -> Frontend
localhost:8000  -> API Gateway
localhost:5059  -> SignalR
localhost:15672 -> RabbitMQ
localhost:5340  -> Seq
```

Her servis icin ayri port acmak gerekliydi. Guvenlik ve yonetim acisindan karmasikti.

### Yeni Durum (Ingress)

```
e-commerce.local/           -> Frontend
e-commerce.local/api/*      -> API Gateway (Ocelot)
e-commerce.local/signalr/*  -> SignalR Hub
seq.e-commerce.local        -> Seq Dashboard
rabbitmq.e-commerce.local   -> RabbitMQ Panel
```

Tek giris kapisi, path-bazli ve host-bazli routing.

### Ingress YAML Yapisi

`k8s/ingress.yaml` dosyasi 5 ayri Ingress resource icerir:

| Ingress | Host | Path | Ozellik |
|---------|------|------|---------|
| `ecommerce-api-ingress` | e-commerce.local | `/api/(.*)` | Rewrite: `/api/x` -> `/x` |
| `ecommerce-signalr-ingress` | e-commerce.local | `/signalr/(.*)` | WebSocket destegi + Rewrite |
| `ecommerce-frontend-ingress` | e-commerce.local | `/` | Catch-all (Next.js) |
| `ecommerce-seq-ingress` | seq.e-commerce.local | `/` | Seq Dashboard |
| `ecommerce-rabbitmq-ingress` | rabbitmq.e-commerce.local | `/` | RabbitMQ Management |

> **Not:** Her Ingress ayri tanimlanir cunku Nginx annotation'lar Ingress seviyesinde calisir. API ve SignalR icin `rewrite-target` annotation'u kullanilir.

### SignalR ve WebSocket Destegi

SignalR Ingress'i ozel annotation'lar icerir:
- `proxy-read-timeout: 3600` (1 saat - WebSocket baglantisi icin)
- `proxy-send-timeout: 3600`
- `upstream-hash-by: $remote_addr` (sticky session benzeri)

---

## Servis Detaylari

### Servis Isimlendirme Stratejisi

K8s Service isimleri, mevcut docker-compose ve ocelot.json konfigurasyonlariyla uyumlu secilmistir:

| K8s Service Adi | docker-compose Karsiligi | Kullanan |
|-----------------|--------------------------|----------|
| `postgres-db` | postgres-db (service name) | Connection string'ler |
| `redis-db` | redis-db (service name) | Basket.API |
| `rabbitmq` | rabbitmq (hostname) | Tum event-driven servisler |
| `ecommerce-seq` | ecommerce-seq (container name) | Serilog appsettings.json |
| `catalog-api` | catalog-api (container name) | ocelot.json routing |
| `basket-api` | basket-api (container name) | ocelot.json routing |
| `order-api` | order-api (container name) | ocelot.json routing |
| `identity-api` | identity-api (container name) | ocelot.json routing, Gateway env |
| `api-gateway` | api-gateway (container name) | Frontend SSR cagrilari |

### Frontend API URL Yapisi

Frontend'deki API URL'leri merkezi olarak `lib/api.ts` dosyasinda tanimlidir:

| Degisken | Kullanim | K8s Degeri | Docker Compose Degeri |
|----------|----------|------------|----------------------|
| `API_URL` | Client-side (tarayici) | `http://e-commerce.local/api` | `http://localhost:8000` |
| `INTERNAL_API_URL` | Server-side (SSR) | `http://api-gateway:8080` | `http://api-gateway:8080` |
| `SIGNALR_URL` | SignalR Hub | `http://e-commerce.local/signalr` | `http://localhost:5059` |

### Environment Variables

Her servisin ortam degiskenleri `apps-backend.yaml` icerisinde tanimlidir. Ornek:

```yaml
env:
  - name: ConnectionStrings__DefaultConnection
    value: "Server=postgres-db;Port=5432;Database=CatalogDb;User Id=postgres;Password=postgres;"
  - name: RabbitMQ__HostName
    value: "rabbitmq"
```

### Resource Limits

Her pod icin kaynak siniri tanimlanmistir:

| Tier | Request (CPU/Mem) | Limit (CPU/Mem) |
|------|-------------------|-----------------|
| Infrastructure | 250m / 256Mi | 500m / 512Mi |
| Backend | 100m / 128Mi | 500m / 256Mi |
| Frontend | 100m / 128Mi | 500m / 512Mi |

### Health Check'ler

- **Altyapi:** Ozel probe'lar (pg_isready, redis-cli ping, rabbitmq-diagnostics)
- **Backend:** TCP Socket probe (port 8080)
- **Frontend:** HTTP GET probe (/ endpoint, port 3000)

---

## Erisim Adresleri

### Ingress ile (Onerilen)

| Servis | URL | Aciklama |
|--------|-----|----------|
| Frontend | http://e-commerce.local | Ana web arayuzu |
| API Gateway | http://e-commerce.local/api/ | Tum API istekleri |
| SignalR | http://e-commerce.local/signalr/ | Gercek zamanli bildirimler |
| Seq | http://seq.e-commerce.local | Merkezi log goruntuleyici |
| RabbitMQ | http://rabbitmq.e-commerce.local | Mesaj kuyrugu paneli (guest/guest) |

### Debug Portlari (port-forward ile)

| Servis | Adres | Aciklama |
|--------|-------|----------|
| PostgreSQL | localhost:5434 | DBeaver vb. ile erişim |
| Redis | localhost:6379 | redis-cli ile erisim |

---

## Otomatik Olcekleme (HPA - Horizontal Pod Autoscaler)

### Nedir?

HPA, pod'larin CPU kullanimini izleyerek otomatik olarak yeni kopyalar (replica) olusturur veya azaltir. Ornegin Black Friday'de Order API'ye yogun trafik geldiginde Kubernetes otomatik olarak 5'e kadar pod olusturur. Yuk azaldiginda tekrar 1 pod'a duser.

### Nasil Calisir?

```
                    Metrics Server
                         |
                    CPU: %85 !
                         |
                  +------v------+
                  |     HPA     |
                  | target: %70 |
                  +------+------+
                         |
              replicas: 1 -> 3
                         |
            +------------+------------+
            |            |            |
      +-----------++-----------++-----------+
      | Order API || Order API || Order API |
      |  Pod #1   ||  Pod #2   ||  Pod #3   |
      +-----------++-----------++-----------+
```

### On Kosul: Metrics Server

HPA'nin calismasi icin Kubernetes Metrics Server gereklidir. `deploy.sh` bunu otomatik kurar. Manuel kurmak icin:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Lokal ortam icin TLS dogrulamasini devre disi birak
kubectl patch deployment metrics-server -n kube-system \
  --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'
```

### HPA Konfigurasyonu

`k8s/hpa.yaml` dosyasinda 4 servis icin HPA tanimlanmistir:

| Servis | Min Pod | Max Pod | CPU Esigi | Neden |
|--------|---------|---------|-----------|-------|
| **order-api** | 1 | 5 | %70 | Siparis yogunlugu (Black Friday senaryosu) |
| **catalog-api** | 1 | 4 | %70 | Urun listeleme + stok kontrolu |
| **basket-api** | 1 | 4 | %70 | Sepet islemleri yogunlugu |
| **api-gateway** | 1 | 3 | %70 | Tum trafik buradan gecer |

> **Not:** Identity ve Payment API'leri HPA disinda birakilmistir. Identity nadiren yogunluk yasarken, Payment zaten event-driven (RabbitMQ consumer) olarak calisir.

### Scale-Up ve Scale-Down Davranisi

| Parametre | Deger | Aciklama |
|-----------|-------|----------|
| Scale-Up bekleme | 30 saniye | Ani trafik artisina hizli tepki |
| Scale-Up hiz | 2 pod / 60 saniye | Her dakika en fazla 2 yeni pod |
| Scale-Down bekleme | 300 saniye (5 dk) | Yuk gercekten dustugunden emin ol |
| Scale-Down hiz | 1 pod / 60 saniye | Yavas yavas azalt (ani kesinti onlenir) |

### Faydali HPA Komutlari

```bash
# HPA durumunu gor
kubectl get hpa -n ecommerce

# Detayli HPA bilgisi (mevcut CPU, hedef, replica sayisi)
kubectl describe hpa order-api-hpa -n ecommerce

# Pod kaynak kullanimini gor (Metrics Server gerekli)
kubectl top pods -n ecommerce

# Node kaynak kullanimini gor
kubectl top nodes

# Manuel olcekleme (HPA'yi gecici olarak devre disi birakir)
kubectl scale deployment/order-api --replicas=3 -n ecommerce

# HPA'yi tekrar aktif etmek icin replica sayisini HPA'ya birak
kubectl apply -f k8s/hpa.yaml
```

### Ornek Cikti: kubectl get hpa -n ecommerce

```
NAME              REFERENCE              TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
order-api-hpa     Deployment/order-api   23%/70%   1         5         1          5m
catalog-api-hpa   Deployment/catalog-api 15%/70%   1         4         1          5m
basket-api-hpa    Deployment/basket-api  10%/70%   1         4         1          5m
api-gateway-hpa   Deployment/api-gateway 18%/70%   1         3         1          5m
```

---

## Faydali Komutlar

### Pod Durumu

```bash
# Tum podlari listele
kubectl get pods -n ecommerce

# Detayli pod bilgisi
kubectl get pods -n ecommerce -o wide

# Belirli bir pod'un loglarini gor
kubectl logs -n ecommerce deployment/catalog-api

# Canli log takibi
kubectl logs -n ecommerce deployment/catalog-api -f

# Tum servisleri listele
kubectl get svc -n ecommerce
```

### Ingress Komutlari

```bash
# Ingress kurallarini listele
kubectl get ingress -n ecommerce

# Ingress detaylarini gor
kubectl describe ingress -n ecommerce

# Ingress Controller loglarini gor
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller -f

# Ingress Controller durumunu kontrol et
kubectl get pods -n ingress-nginx
```

### Sorun Giderme

```bash
# Pod detayi (hata durumunda)
kubectl describe pod -n ecommerce -l app=catalog-api

# Pod'a shell ile baglan
kubectl exec -it -n ecommerce deployment/catalog-api -- /bin/bash

# Eventleri gor
kubectl get events -n ecommerce --sort-by='.lastTimestamp'
```

### Yeniden Deploy

```bash
# Tek bir servisi yeniden baslat
kubectl rollout restart deployment/catalog-api -n ecommerce

# Imaji yeniden derle ve deploy et
docker build -t catalog-api:latest -f src/Services/Catalog.API/Dockerfile .
kubectl rollout restart deployment/catalog-api -n ecommerce
```

### Olceklendirme

```bash
# Catalog API'yi 3 replica'ya cikar
kubectl scale deployment/catalog-api --replicas=3 -n ecommerce

# Replica sayisini gor
kubectl get deployment -n ecommerce
```

---

## Sorun Giderme

### Pod "ImagePullBackOff" veya "ErrImageNeverPull" hatasi

Imajlar lokalde build edilmemis. Cozum:
```bash
./k8s/build-images.sh
kubectl rollout restart deployment/<servis-adi> -n ecommerce
```

### Pod "CrashLoopBackOff" hatasi

Uygulama baslatma sirasinda hata aliyor. Loglari kontrol et:
```bash
kubectl logs -n ecommerce deployment/<servis-adi> --previous
```

Sik nedenler:
- Veritabani henuz hazir degil (altyapinin baslamasini bekleyin)
- Connection string hatali (env degiskenlerini kontrol edin)

### PostgreSQL veritabani olusturulamadi

Init script'in calisip calismadigini kontrol et:
```bash
kubectl logs -n ecommerce deployment/postgres-db
```

Veritabanlarini manuel kontrol et:
```bash
kubectl exec -it -n ecommerce deployment/postgres-db -- psql -U postgres -l
```

### Port 5434 zaten kullanımda hatası
`port-forward.sh` zaten PostgreSQL'i 5434'e yönlendiriyor demektir. DBeaver ile doğrudan `localhost:5434` kullan. Alternatif: `./k8s/port-forward-postgres.sh` (localhost:5435).

### e-commerce.local erisim hatasi

1. `/etc/hosts` dosyasini kontrol edin:
```bash
cat /etc/hosts | grep e-commerce
# 127.0.0.1  e-commerce.local seq.e-commerce.local rabbitmq.e-commerce.local
```

2. Ingress Controller'in calistigini kontrol edin:
```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

3. Ingress kurallarinin dogru uygulandigini kontrol edin:
```bash
kubectl get ingress -n ecommerce
kubectl describe ingress ecommerce-api-ingress -n ecommerce
```

4. Ingress Controller loglarini kontrol edin:
```bash
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=50
```

### Frontend API'ye ulasamiyor

Ingress uzerinden test edin:
```bash
curl http://e-commerce.local/api/catalog/products
```

### RabbitMQ baglanti hatasi

RabbitMQ'nun hazir olmasini bekle:
```bash
kubectl wait -n ecommerce --for=condition=ready pod -l app=rabbitmq --timeout=120s
```

---

## docker-compose vs Kubernetes Karsilastirma

| Ozellik | docker-compose | Kubernetes |
|---------|----------------|------------|
| Baslatma | `docker compose up` | `./k8s/deploy.sh` |
| Durdurma | `docker compose down` | `./k8s/teardown.sh` |
| Imaj Build | Otomatik (`build:` blogu) | Manuel (`./k8s/build-images.sh`) |
| Ag (Network) | `ecommerce-network` bridge | `ecommerce` namespace + Service DNS |
| Depolama | Docker volume | PersistentVolumeClaim |
| Servis Kesfetme | Container adi | Service adi (ayni) |
| Olceklendirme | Yok | `kubectl scale` + **HPA (otomatik)** |
| Health Check | `healthcheck:` | `readinessProbe` + `livenessProbe` |
| Kaynak Siniri | Yok (varsayilan) | `resources.requests/limits` |
| Self-healing | Yok | Otomatik pod yeniden baslatma |
| Dis Erisim | `ports:` mapping | **Ingress Controller** |
| Trafik Yonetimi | Yok | Nginx Ingress (path/host routing) |

### Neden Kubernetes?

1. **Ingress Controller:** Tek giris kapisi, path-bazli routing, SSL/TLS destegi
2. **Self-healing:** Pod cokulurse otomatik yeniden baslar
3. **Olceklendirme:** `kubectl scale` ile manuel + **HPA ile otomatik** replica yonetimi
4. **Kaynak Yonetimi:** CPU/Memory limitleri ile izolasyon
5. **Health Check:** Readiness + Liveness probe'lar ile saglik kontrolu
6. **Rolling Update:** Sifir kesinti ile guncelleme
7. **Production'a Yakin:** Gercek ortama en yakin gelistirme deneyimi

---

## Dosya Referansi

| Dosya | Aciklama |
|-------|----------|
| `k8s/infrastructure.yaml` | Namespace + PostgreSQL + Redis + RabbitMQ + Seq |
| `k8s/apps-backend.yaml` | 5 Backend API + API Gateway (Deployment + Service) |
| `k8s/apps-frontend.yaml` | Next.js Frontend (Deployment + Service) |
| `k8s/hpa.yaml` | HPA: Order, Catalog, Basket, API Gateway otomatik olcekleme |
| `k8s/ingress.yaml` | Nginx Ingress routing (5 Ingress resource) |
| `k8s/build-images.sh` | 7 Docker imajini derler (Ingress URL'leri baked-in) |
| `k8s/deploy.sh` | Ingress Controller + Metrics Server + sirayla altyapi -> backend -> frontend -> HPA -> ingress deploy |
| `k8s/port-forward.sh` | Debug portlari (PostgreSQL/Redis) veya --all ile tum portlar |
| `k8s/teardown.sh` | Tum K8s kaynaklarini siler (--all ile Ingress Controller dahil) |
| `src/Clients/ecommerce-web/lib/api.ts` | Merkezi API URL konfigurasyonu |
| `src/Clients/ecommerce-web/Dockerfile` | Build arg destegi (API + SignalR URL) |
