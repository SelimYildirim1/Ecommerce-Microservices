# Servisleri Başlatma Kılavuzu

Projeyi **Docker Compose** veya **Kubernetes** ile çalıştırabilirsiniz. İkisi birbirinden bağımsızdır; aynı anda sadece birini kullanın.

---

## Seçenek 1: Docker Compose (Önerilen - Geliştirme)

En hızlı ve basit yöntem. Tüm servisler Docker container olarak çalışır.

### Gereksinimler
- Docker (veya OrbStack) çalışıyor olmalı

### Başlatma

```bash
./scripts/start-docker.sh
```

Varsayılan **lite** moddur: Seq / Jaeger / Prometheus / Grafana açılmaz (Mac RAM dostu).

Monitoring dahil tam stack:

```bash
./scripts/start-docker.sh --full
```

Detaylı log için:

```bash
./scripts/start-docker.sh --no-detach
```

### Erişim Adresleri

| Servis       | Adres                      | Not |
|--------------|----------------------------|-----|
| Frontend     | http://localhost:3000      | lite |
| API Gateway  | http://localhost:8001      | lite (8000 Cursor ile cakismasin diye) |
| RabbitMQ     | http://localhost:15672     | lite |
| Admin Panel  | http://localhost:3002      | `src/admin-panel` icinde `npm run dev -- -p 3002` |
| MailHog      | http://localhost:8025      | lite (giden e-postalar burada birikir, disariya cikmaz) |
| Seq (Loglar) | http://localhost:5340      | sadece `--full` |
| Prometheus   | http://localhost:9090      | sadece `--full` |
| Grafana      | http://localhost:3001      | sadece `--full` |

### Durdurma

```bash
./scripts/stop-docker.sh
```

veya `docker compose down`

---

## Seçenek 2: Kubernetes (Önerilen - Production benzeri)

Servisler Kubernetes pod'ları olarak çalışır. Self-healing, ölçeklendirme ve production'a yakın deneyim sunar.

### Gereksinimler
- OrbStack veya Docker Desktop (Kubernetes aktif olmalı)
- `kubectl` kurulu olmalı

### Başlatma

```bash
./scripts/start-k8s.sh
```

Bu komut imajları derler ve K8s'e deploy eder. Ardından **ayrı bir terminal** açın:

```bash
./k8s/port-forward.sh
```

### Erişim Adresleri

Port-forward çalışırken aynı adresler geçerlidir:

| Servis       | Adres                      |
|--------------|----------------------------|
| Frontend     | http://localhost:3000      |
| API Gateway  | http://localhost:8000      |
| RabbitMQ     | http://localhost:15672     |
| Seq          | http://localhost:5340      |
| Prometheus   | http://prometheus.e-commerce.local |
| Grafana      | http://grafana.e-commerce.local (admin/admin) |

### Durdurma

1. Port-forward'u durdurun: `Ctrl+C`
2. K8s kaynaklarını silin:

```bash
./k8s/teardown.sh
```

---

## Karşılaştırma

|                    | Docker Compose | Kubernetes |
|--------------------|----------------|------------|
| Başlatma süresi    | Daha hızlı     | Biraz daha uzun |
| Karmaşıklık        | Basit          | Orta       |
| Self-healing       | Yok            | Var        |
| Ölçeklendirme      | Manuel         | **HPA (Otomatik)** + `kubectl scale` |
| Ne zaman kullan    | Geliştirme     | Test / Production benzeri |

---

## Sorun Giderme

### Docker Compose: "port is already allocated"
Başka bir uygulama o portu kullanıyor. Kubernetes kullanıyorsanız önce `./k8s/teardown.sh` çalıştırın.

### Kubernetes: "ImagePullBackOff"
İmajlar derlenmemiş. `./k8s/build-images.sh` çalıştırın.

### Kubernetes: Pod'lar hazır değil
Biraz bekleyin. Kontrol için:
```bash
kubectl get pods -n ecommerce
```

### İkisini birlikte çalıştırabilir miyim?
Hayır. Aynı portları (3000, 8000, vb.) kullandıkları için çakışma olur. Önce birini durdurun, sonra diğerini başlatın.
