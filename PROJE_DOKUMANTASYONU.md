# E-Commerce Mikroservis Projesi - Geliştirici Dokümantasyonu

---

## 1. Projeye Genel Bakış

Bu proje, **mikroservis mimarisi** ile geliştirilmiş bir e-ticaret uygulamasıdır. Backend tarafında **.NET 8** ile yazılmış 6 bağımsız servis, frontend tarafında **Next.js (React 19)** ile yazılmış bir web uygulaması ve bunları birbirine bağlayan bir **API Gateway (Ocelot)** bulunmaktadır.

Servisler arası iletişim **RabbitMQ** üzerinden **MassTransit** kütüphanesi ile asenkron mesajlaşma (event-driven) yöntemiyle sağlanır. Sipariş süreci, **Choreography-Based Saga Pattern** ile yönetilir; yani merkezi bir orkestratör yoktur, her servis kendi olayını dinleyip bir sonraki adımı tetikler.

---

## 2. Mimari Şema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KULLANICI (Tarayıcı)                        │
│                      http://localhost:3000                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   ecommerce-web (Next.js Frontend)                   │
│  Server-Side → http://api-gateway:8080  (Docker ağı içinden)         │
│  Client-Side → http://localhost:8000    (Tarayıcıdan)                │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    API Gateway (Ocelot) :8000                        │
│                                                                      │
│  /catalog/**  ──→  Catalog.API:8080                                  │
│  /basket/**   ──→  Basket.API:8080                                   │
│  /orders/**   ──→  Order.API:8080      (JWT Gerekli)                 │
│  /auth/**     ──→  Identity.API:8080                                 │
└────────┬──────────────┬──────────────┬───────────────┬───────────────┘
         │              │              │               │
         ▼              ▼              ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│ Catalog.API │ │ Basket.API  │ │  Order.API   │ │ Identity.API │
│   :5000     │ │   :5038     │ │   :5059      │ │   :5001      │
│ PostgreSQL  │ │   Redis     │ │  PostgreSQL  │ │  PostgreSQL  │
└──────┬──────┘ └──────┬──────┘ └──────┬───────┘ └──────────────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
              ┌────────▼────────┐
              │    RabbitMQ     │
              │  :5672 (AMQP)  │
              │  :15672 (Mgmt) │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼                           ▼
┌─────────────────┐       ┌──────────────────┐
│  Payment.API    │       │ Notification.API │
│    :5277        │       │   (Consumer)     │
│  (Consumer)     │       │                  │
└─────────────────┘       └──────────────────┘
```

---

## 3. Altyapı Servisleri (docker-compose.yml)

| Servis | Image | Port | Görevi |
|--------|-------|------|--------|
| **postgres-db** | `postgres:latest` | `5434:5432` | Catalog, Identity ve Order servisleri için ortak PostgreSQL veritabanı |
| **redis-db** | `redis:alpine` | `6379:6379` | Basket.API'nin sepet verilerini sakladığı in-memory cache |
| **rabbitmq** | `rabbitmq:3-management` | `5672` (AMQP) + `15672` (Yönetim Paneli) | Servisler arası asenkron mesajlaşma altyapısı |
| **seq** | `datalust/seq:latest` | `5340:80` + `5341:5341` | Merkezi yapılandırılmış log toplama (Serilog ile entegre) |

Tüm servisler `ecommerce-network` adlı bir Docker bridge network üzerinde iletişim kurar.

---

## 4. Servisler ve Dosya Bazlı İşleyiş

---

### 4.1. Identity.API (Kimlik Doğrulama Servisi)

**Görev:** Kullanıcı kaydı, giriş işlemi ve JWT token üretimi.

**Veritabanı:** PostgreSQL → `IdentityDB` (ASP.NET Identity tabloları)

| Dosya | Ne Yapar |
|-------|----------|
| `Program.cs` | ASP.NET Identity + JWT Bearer Authentication yapılandırması. Uygulama başlarken otomatik migration çalıştırır. |
| `Controller/AuthController.cs` | İki endpoint sunar: |
| | **POST /api/auth/register** → Yeni kullanıcı oluşturur. `UserManager.CreateAsync` ile kullanıcıyı kaydeder, başarılıysa hemen JWT token döner. |
| | **POST /api/auth/login** → Email ve şifreyi doğrular. `SignInManager.CheckPasswordSignInAsync` ile kontrol eder, başarılıysa JWT token döner. |
| `Models/ApplicationUser.cs` | `IdentityUser`'dan türetilmiş kullanıcı modeli. `FirstName` ve `LastName` alanları eklenmiş. |
| `Models/AuthDtos.cs` | `RegisterRequest`, `LoginRequest` ve `AuthResponse` DTO'ları. |
| `Data/AppIdentityDbContext.cs` | `IdentityDbContext<ApplicationUser>` — Identity tabloları (Users, Roles vb.) burada tanımlı. |

**JWT Token İçeriği (Claims):**
- `sub` → Kullanıcı ID
- `email` → E-posta adresi
- `given_name` → Kullanıcı adı
- `jti` → Benzersiz token ID

**JWT Ayarları** (`appsettings.json`):
- Süre: 43200 dakika (30 gün)
- Issuer: `IdentityAPI`
- Audience: `ECommerceClient`

---

### 4.2. Catalog.API (Ürün Katalogu Servisi)

**Görev:** Ürün CRUD işlemleri, stok yönetimi ve stok rezervasyonu (Saga'nın bir parçası).

**Veritabanı:** PostgreSQL → `CatalogDB`

**Mimari Desen:** CQRS (Command Query Responsibility Segregation) + MediatR

| Dosya | Ne Yapar |
|-------|----------|
| `Program.cs` | PostgreSQL, MediatR (CQRS), FluentValidation, MassTransit/RabbitMQ yapılandırması. Otomatik migration + seed data çalıştırır. |
| `Controllers/ProductsController.cs` | Controller sadece isteği alıp MediatR'a yönlendirir (thin controller prensibi): |
| | **GET /api/products** → `GetProductsQuery` gönderir → Tüm ürünleri listeler. |
| | **GET /api/products/{id}** → `GetProductByIdQuery` gönderir → ID'ye göre ürün getirir. |
| | **POST /api/products** → `CreateProductCommand` gönderir → Yeni ürün oluşturur. |
| `Entities/Product.cs` | Ürün entity'si: `Id`, `Name`, `Description`, `Price`, `PictureUrl`, `StockQuantity`, `CreatedAt`. |
| `Data/CatalogDbContext.cs` | EF Core DbContext. `Products` tablosunu tanımlar. |
| `Data/CatalogDbSeeder.cs` | Uygulama ilk başlatıldığında Products tablosu boşsa **50 adet örnek ürün** ekler. Ürünler 5 kategoride (Elektronik, Giyim, Ev & Yaşam, Spor, Kitap & Kırtasiye) dağılmıştır. |

**CQRS Dosyaları:**

| Dosya | Ne Yapar |
|-------|----------|
| `Products/GetProducts/GetProductsQuery.cs` | Parametresiz sorgu tanımı. `ProductDto` record'u da burada tanımlı. |
| `Products/GetProducts/GetProductsHandler.cs` | Veritabanından tüm ürünleri `AsNoTracking()` ile çekip `ProductDto`'ya dönüştürür. |
| `Products/GetProductById/GetProductByIdQuery.cs` | `Guid Id` parametreli sorgu tanımı. |
| `Products/GetProductById/GetProductByIdHandler.cs` | ID'ye göre tek ürün bulur, `ProductDto`'ya dönüştürür. |
| `Products/CreateProduct/CreateProductCommand.cs` | Yeni ürün oluşturma komutu (record). |
| `Products/CreateProduct/CreateProductCommandValidator.cs` | FluentValidation kuralları: Ad boş olamaz (2-150 karakter), Fiyat > 0, Stok >= 0, Resim yolu gerekli. |
| `Products/CreateProduct/CreateProductHandler.cs` | Ürünü DB'ye kaydeder, ardından `ProductCreatedEvent` mesajını RabbitMQ'ya publish eder. |

**Consumer'lar (RabbitMQ Dinleyicileri):**

| Dosya | Dinlediği Event | Ne Yapar |
|-------|----------------|----------|
| `Consumers/OrderCreatedConsumer.cs` | `OrderCreatedEvent` | **STOK REZERVASYONU:** Siparişteki her ürün için stok kontrolü yapar. Tüm ürünlerde yeterli stok varsa stokları düşer ve `StockReservedEvent` yayımlar. Herhangi birinde yetersiz stok varsa hiçbir stok düşmez ve `StockNotReservedEvent` yayımlar. Kuyruk adı: `catalog-stock-update-queue` |
| `Consumers/PaymentFailedConsumer.cs` | `PaymentFailedEvent` | **TELAFİ EDİCİ İŞLEM (Compensating Transaction):** Ödeme başarısız olduğunda daha önce düşülen stokları geri ekler. Event içindeki `OrderItems` listesine bakarak her ürünün stoğunu artırır. |

---

### 4.3. Basket.API (Sepet Servisi)

**Görev:** Kullanıcının alışveriş sepetini yönetir (ekleme, güncelleme, silme, checkout).

**Veritabanı:** Redis (in-memory key-value store, key = userName)

| Dosya | Ne Yapar |
|-------|----------|
| `Program.cs` | Redis, MassTransit/RabbitMQ, HttpClient (Catalog API ile iletişim) yapılandırması. |
| `Entities/ShoppingCart.cs` | Sepet modeli: `UserName`, `Items` listesi, hesaplanmış `TotalPrice` property'si. |
| `Entities/ShoppingCartItem.cs` | Sepet öğesi: `ProductId`, `ProductName`, `Price`, `Quantity`, `Color`. |
| `Entities/BasketCheckout.cs` | Checkout isteği modeli: Kullanıcı bilgileri + kart bilgileri. |
| `Models/CatalogProductDto.cs` | Catalog API'den dönen ürün bilgisi: `Id`, `Name`, `Price`. |
| `Repositories/IBasketRepository.cs` | Repository arayüzü: `GetBasket`, `UpdateBasket`, `DeleteBasket`. |
| `Repositories/BasketRepository.cs` | Redis üzerinde CRUD işlemleri. Sepet JSON olarak `IDistributedCache` ile saklanır. |
| `Services/CatalogService.cs` | Catalog API'ye HTTP isteği atar. Ürün ID'sine göre ürünün **gerçek fiyatını ve adını** çeker. |

**Controller Endpoint'leri** (`Controllers/BasketController.cs`):

| Endpoint | Ne Yapar |
|----------|----------|
| **GET /api/basket/{userName}** | Kullanıcının sepetini Redis'ten getirir. Sepet yoksa boş sepet döner. |
| **POST /api/basket** | Sepeti günceller. **Güvenlik adımı:** Her ürün için Catalog API'ye sorarak gerçek fiyatı ve adı yazar. Kullanıcı Postman'den sahte fiyat gönderse bile bu adım onu ezer. Catalog'da bulunmayan ürünler sepetten çıkarılır. |
| **DELETE /api/basket/{userName}** | Sepeti tamamen siler. |
| **POST /api/basket/checkout** | **Checkout işlemi** (Saga'nın başlangıç noktası): |
| | 1. Redis'ten sepeti getirir |
| | 2. Sepet boşsa hata döner |
| | 3. `BasketCheckoutEventMessage` oluşturur (sepet ürünleri + kart bilgileri + adres bilgileri) |
| | 4. MassTransit ile RabbitMQ'ya publish eder (5 saniye timeout) |
| | 5. Sepeti Redis'ten siler |
| | 6. `202 Accepted` döner (asenkron işlem devam ediyor) |

---

### 4.4. Order.API (Sipariş Servisi)

**Görev:** Siparişleri oluşturur, durumlarını yönetir (Submitted → Paid / Failed / StockFailed).

**Veritabanı:** PostgreSQL → `OrderDb`

| Dosya | Ne Yapar |
|-------|----------|
| `Program.cs` | PostgreSQL, MediatR, MassTransit/RabbitMQ yapılandırması. 4 farklı consumer kaydeder. Otomatik migration çalıştırır. |
| `Entities/Order.cs` | Sipariş entity'si: `Id`, `UserName`, `TotalPrice`, kişisel bilgiler, `OrderStatus` (varsayılan: "Submitted"), `OrderItems` listesi. |
| `Entities/OrderItem.cs` | Sipariş kalemi: `ProductId`, `ProductName`, `Price`, `Quantity`, `OrderId` (FK). |
| `Data/OrderDbContext.cs` | EF Core DbContext. Orders ve OrderItems tablolarını tanımlar. Order → OrderItems ilişkisini (1:N) yapılandırır. |

**Controller Endpoint'i** (`Controllers/OrderController.cs`):

| Endpoint | Ne Yapar |
|----------|----------|
| **GET /api/orders/{userName}** | Kullanıcının tüm siparişlerini (ürün detaylarıyla birlikte) tarihe göre azalan sırada listeler. `OrderDto` ve `OrderItemDto` olarak döner. |

**Consumer'lar (RabbitMQ Dinleyicileri):**

| Dosya | Dinlediği Event | Ne Yapar |
|-------|----------------|----------|
| `Consumers/BasketCheckoutConsumer.cs` | `BasketCheckoutEvent` | **SİPARİŞ OLUŞTURMA:** Gelen checkout mesajından yeni bir `Order` entity'si oluşturur, OrderItems'ları ekler, veritabanına kaydeder. Ardından `OrderCreatedEvent` yayımlar (kart bilgileri dahil). |
| `Consumers/PaymentSucceededConsumer.cs` | `PaymentSucceededEvent` | Siparişin `OrderStatus`'unu **"Paid"** olarak günceller. Kuyruk: `order-payment-succeeded-queue` |
| `Consumers/PaymentFailedConsumer.cs` | `PaymentFailedEvent` | Siparişin `OrderStatus`'unu **"Failed"** olarak günceller. Kuyruk: `order-payment-failed-queue` |
| `Consumers/StockNotReservedConsumer.cs` | `StockNotReservedEvent` | Siparişin `OrderStatus`'unu **"StockFailed"** olarak günceller. Kuyruk: `order-stock-not-reserved-queue` |

---

### 4.5. Payment.API (Ödeme Servisi)

**Görev:** Stok ayrıldıktan sonra ödeme işlemini simüle eder.

**Veritabanı:** Yok (stateless servis)

| Dosya | Ne Yapar |
|-------|----------|
| `Program.cs` | MassTransit/RabbitMQ yapılandırması. Sadece `StockReservedConsumer` kaydeder. |
| `Consumers/StockReservedConsumer.cs` | `StockReservedEvent` dinler. **ÖDEME SİMÜLASYONU:** |
| | 1. 3 saniye bekler (banka simülasyonu) |
| | 2. `TotalPrice > 0` ise ödeme başarılı sayılır → `PaymentSucceededEvent` yayımlar |
| | 3. `TotalPrice <= 0` ise ödeme başarısız → `PaymentFailedEvent` yayımlar (OrderItems dahil, stok iadesi için) |
| | Kuyruk: `stock-reserved-queue` |

---

### 4.6. Notification.API (Bildirim Servisi)

**Görev:** Ödeme sonuçlarına göre kullanıcıya bildirim gönderir (şu an log ile simüle ediliyor).

**Veritabanı:** Yok (stateless servis)

| Dosya | Ne Yapar |
|-------|----------|
| `Program.cs` | MassTransit/RabbitMQ yapılandırması. `PaymentSucceededConsumer` ve `PaymentFailedConsumer` kaydeder. |
| `Consumers/PaymentSucceededConsumer.cs` | `PaymentSucceededEvent` dinler. Loglara başarılı ödeme bildirimi yazar. Gerçek dünyada buradan SMTP e-posta gönderilecek. Kuyruk: `notification-payment-succeeded-queue` |
| `Consumers/PaymentFailedConsumer.cs` | `PaymentFailedEvent` dinler. Loglara başarısız ödeme bildirimi yazar. Kuyruk: `notification-payment-failed-queue` |

---

### 4.7. API Gateway (Ocelot)

**Görev:** Tüm frontend isteklerini tek bir noktadan karşılayıp ilgili mikroservise yönlendirir. JWT doğrulaması yapar.

| Dosya | Ne Yapar |
|-------|----------|
| `Program.cs` | Ocelot, JWT Bearer Authentication, Serilog, CORS yapılandırması. Middleware sırası: CORS → Authentication → Authorization → Ocelot. |
| `ocelot.json` | Yönlendirme kuralları: |

**Yönlendirme Tablosu:**

| Gateway Yolu | Hedef Servis | Auth Gerekli? |
|-------------|-------------|---------------|
| `GET/POST /catalog/products` | Catalog.API `/api/products` | Hayır |
| `GET /catalog/products/{id}` | Catalog.API `/api/products/{id}` | Hayır |
| `GET/DELETE /basket/{userName}` | Basket.API `/api/basket/{userName}` | Hayır |
| `POST /basket` | Basket.API `/api/basket` | Hayır |
| `POST /basket/checkout` | Basket.API `/api/basket/checkout` | **Evet** |
| `GET /orders/{userName}` | Order.API `/api/orders/{userName}` | **Evet** |
| `GET/POST /auth/{everything}` | Identity.API `/api/auth/{everything}` | Hayır |

---

### 4.8. Core.Shared (Ortak Kütüphane)

**Görev:** Servisler arasında paylaşılan event sınıfları ve ortak davranışlar.

| Dosya | Ne Yapar |
|-------|----------|
| `Events/BasketCheckoutEvent.cs` | Checkout mesajının temel sınıfı. Kullanıcı bilgileri, kart bilgileri ve `BasketItems` listesi taşır. |
| `Events/BasketCheckoutEventMessage.cs` | `BasketCheckoutEvent`'ten türer. MassTransit'in somut sınıf gerektirmesi nedeniyle oluşturulmuş. |
| `Events/OrderCreatedEvent.cs` | Sipariş oluşturulduğunda yayımlanır. OrderId, alıcı bilgileri, kart bilgileri ve `OrderItems` listesi taşır. |
| `Events/OrderItemMessage.cs` | Sipariş kalemlerini taşıyan DTO. `ProductId`, `ProductName`, `Price`, `Quantity`. |
| `Events/StockReservedEvent.cs` | Stok başarıyla ayrıldığında yayımlanır. Ödeme bilgilerini ve `OrderItems` listesini taşır. |
| `Events/StockNotReservedEvent.cs` | Stok yetersiz olduğunda yayımlanır. `OrderId`, `BuyerId`, `Email`, `Reason`. |
| `Events/PaymentSucceededEvent.cs` | Ödeme başarılı olduğunda yayımlanır. `OrderId`, `Email`. |
| `Events/PaymentFailedEvent.cs` | Ödeme başarısız olduğunda yayımlanır. `OrderId`, `Email`, `Reason` ve stok iadesi için `OrderItems`. |
| `Events/ProductCreatedEvent.cs` | Yeni ürün oluşturulduğunda yayımlanır. Interface olarak tanımlı (MassTransit best practice). |
| `Behaviors/ValidationBehavior.cs` | MediatR pipeline davranışı. Her Command/Query çalışmadan önce FluentValidation kurallarını çalıştırır. Hata varsa `ValidationException` fırlatır. |

---

## 5. Frontend (ecommerce-web)

**Teknoloji:** Next.js 16 + React 19 + TailwindCSS 4 + TypeScript

**Önemli Not:** Next.js'in Server Component'leri Docker ağı içinden `http://api-gateway:8080` ile, Client Component'leri (tarayıcıdan) `http://localhost:8000` ile Gateway'e erişir.

### Sayfa Yapısı

| Sayfa | Dosya | SSR/CSR | Ne Yapar |
|-------|-------|---------|----------|
| **Ana Sayfa** | `app/page.tsx` | Server | Catalog API'den ürünleri çeker ve listeler. Her ürünün yanında "Sepete Ekle" butonu var. |
| **Giriş** | `app/login/page.tsx` | Client | E-posta ve şifre ile giriş. Gateway üzerinden Identity.API'ye istek atar. Token'ı AuthContext'e gönderir. |
| **Kayıt** | `app/register/page.tsx` | Client | Yeni kullanıcı kaydı. Başarılıysa login sayfasına yönlendirir. |
| **Sepet** | `app/cart/page.tsx` | Server + Client | Server tarafında cookie'den token'ı decode edip userId çıkarır, Basket API'den sepeti çeker. `CartClient` component'ine aktarır. |
| **Checkout** | `app/checkout/page.tsx` | Client | Adres ve kart bilgilerini toplar. `POST /basket/checkout` ile Gateway'e gönderir (JWT header ile). |
| **Siparişlerim** | `app/orders/page.tsx` | Client | Kullanıcının tüm siparişlerini Gateway üzerinden çeker. Durum renklendirmesi yapar (Yeşil: Paid, Kırmızı: Failed/StockFailed, Mavi: Submitted). |

### Bileşenler (Components)

| Bileşen | Dosya | Ne Yapar |
|---------|-------|----------|
| **Header** | `components/Header.tsx` | Üst menü. Giriş yapılmışsa kullanıcı adı + çıkış butonu, yapılmamışsa giriş/kayıt linkleri gösterir. Sepet sayısını `CartContext`'ten alır. |
| **AddToCartButton** | `components/AddToCartButton.tsx` | Ürün kartlarındaki "Sepete Ekle" butonu. Kullanıcı giriş yapmamışsa login'e yönlendirir. Mevcut sepeti GET ile alır, ürünü ekler/adetini artırır, POST ile günceller. |
| **CartClient** | `components/CartClient.tsx` | Sepet sayfasının interaktif kısmı. Adet artırma/azaltma, ürün silme, toplam hesaplama ve "Siparişi Tamamla" butonu. |

### Context'ler (Global State)

| Context | Dosya | Ne Sağlar |
|---------|-------|-----------|
| **AuthContext** | `context/AuthContext.tsx` | `user` (id, name, email), `login(token)`, `logout()`, `isLoading`. JWT token'ı cookie'de 30 gün saklar. Token'ı decode ederek kullanıcı bilgisini çıkarır. |
| **CartContext** | `context/CartContext.tsx` | `cartCount`, `refreshCartCount()`. Kullanıcı değiştiğinde veya sepet güncellendiğinde Gateway'den sepet sayısını çeker. |

---

## 6. Sipariş Süreci - Adım Adım İşleyiş (Saga Flow)

Aşağıda bir kullanıcının "Sepete Ekle" butonuna basmasından sipariş tamamlanana kadar olan tüm süreç, hangi servisin hangi dosyasında ne yaptığıyla birlikte anlatılmıştır.

---

### Adım 0: Ürünleri Listeleme

```
Kullanıcı → ecommerce-web (page.tsx) → Gateway → Catalog.API
```

1. `app/page.tsx` server-side'da `http://api-gateway:8080/catalog/products` adresine GET isteği atar.
2. Gateway bunu `Catalog.API:8080/api/products` adresine yönlendirir.
3. `ProductsController.cs` → MediatR → `GetProductsHandler.cs` → PostgreSQL'den ürünleri çeker.
4. Ürünler frontend'de kartlar halinde listelenir.

---

### Adım 1: Sepete Ekleme

```
Kullanıcı → AddToCartButton → Gateway → Basket.API → Catalog.API (fiyat doğrulama)
```

1. **AddToCartButton.tsx**: Kullanıcı "Sepete Ekle" butonuna basar.
2. Önce mevcut sepeti `GET /basket/{userId}` ile alır.
3. Ürünü listeye ekler (varsa adetini artırır).
4. Güncel sepeti `POST /basket` ile gönderir.
5. **BasketController.cs** (`UpdateBasket` metodu):
   - Her ürün için `CatalogService.cs` üzerinden Catalog API'ye sorgu atar.
   - Catalog API'den dönen **gerçek fiyatı** kullanır (sahte fiyat gönderilmesini engeller).
   - Catalog'da bulunmayan ürünleri sepetten çıkarır.
   - Doğrulanmış sepeti Redis'e kaydeder.

---

### Adım 2: Checkout (Ödeme Başlatma) — SAGA BAŞLANGIÇ NOKTASI

```
Kullanıcı → Checkout Sayfası → Gateway (JWT doğrulama) → Basket.API → RabbitMQ
```

1. **checkout/page.tsx**: Kullanıcı adres ve kart bilgilerini doldurur, "Ödemeyi Tamamla" butonuna basar.
2. `POST /basket/checkout` isteği Gateway'e gider (JWT token header'da).
3. Gateway JWT'yi doğrular, isteği Basket.API'ye yönlendirir.
4. **BasketController.cs** (`Checkout` metodu):
   - Redis'ten sepeti çeker.
   - `BasketCheckoutEventMessage` oluşturur (sepet ürünleri + kart + adres bilgileri).
   - **RabbitMQ'ya publish eder** (`BasketCheckoutEvent`).
   - Sepeti Redis'ten siler.
   - `202 Accepted` döner.

---

### Adım 3: Sipariş Oluşturma

```
RabbitMQ → Order.API (BasketCheckoutConsumer)
```

1. **Order.API** → `Consumers/BasketCheckoutConsumer.cs`:
   - `BasketCheckoutEvent` mesajını dinler.
   - Yeni `Order` entity'si oluşturur (status: "Submitted").
   - Sipariş kalemlerini (`OrderItem`) ekler.
   - PostgreSQL'e kaydeder.
   - **`OrderCreatedEvent` yayımlar** (kart bilgileri dahil, stok kontrolü ve ödeme için).

---

### Adım 4: Stok Kontrolü ve Rezervasyonu

```
RabbitMQ → Catalog.API (OrderCreatedConsumer)
```

1. **Catalog.API** → `Consumers/OrderCreatedConsumer.cs`:
   - `OrderCreatedEvent` mesajını dinler.
   - Siparişteki her ürün için stok kontrolü yapar.

**Başarılı Senaryo (Yeterli Stok):**
   - Tüm ürünlerin stoklarını düşer.
   - PostgreSQL'e kaydeder.
   - **`StockReservedEvent` yayımlar** (kart bilgileri + OrderItems dahil).

**Başarısız Senaryo (Yetersiz Stok):**
   - Hiçbir stok düşülmez (tümü ya da hiçbiri prensibi).
   - **`StockNotReservedEvent` yayımlar** (sebep açıklaması ile).

---

### Adım 5a: Ödeme İşlemi (Stok Başarılıysa)

```
RabbitMQ → Payment.API (StockReservedConsumer)
```

1. **Payment.API** → `Consumers/StockReservedConsumer.cs`:
   - `StockReservedEvent` mesajını dinler.
   - 3 saniye bekler (banka simülasyonu).
   - `TotalPrice > 0` → Ödeme başarılı → **`PaymentSucceededEvent` yayımlar**.
   - `TotalPrice <= 0` → Ödeme başarısız → **`PaymentFailedEvent` yayımlar** (OrderItems dahil).

---

### Adım 5b: Sipariş Durumu Güncelleme (Stok Başarısızsa)

```
RabbitMQ → Order.API (StockNotReservedConsumer)
```

1. **Order.API** → `Consumers/StockNotReservedConsumer.cs`:
   - Siparişin `OrderStatus`'unu **"StockFailed"** olarak günceller.

---

### Adım 6a: Ödeme Başarılı — Happy Path Tamamlanması

```
RabbitMQ → Order.API (PaymentSucceededConsumer)
RabbitMQ → Notification.API (PaymentSucceededConsumer)
```

1. **Order.API** → `Consumers/PaymentSucceededConsumer.cs`:
   - Siparişin `OrderStatus`'unu **"Paid"** olarak günceller.

2. **Notification.API** → `Consumers/PaymentSucceededConsumer.cs`:
   - Kullanıcıya başarılı ödeme bildirimi gönderir (log ile simüle ediliyor).

---

### Adım 6b: Ödeme Başarısız — Compensating Transaction (Telafi)

```
RabbitMQ → Order.API (PaymentFailedConsumer)
RabbitMQ → Catalog.API (PaymentFailedConsumer)
RabbitMQ → Notification.API (PaymentFailedConsumer)
```

1. **Order.API** → `Consumers/PaymentFailedConsumer.cs`:
   - Siparişin `OrderStatus`'unu **"Failed"** olarak günceller.

2. **Catalog.API** → `Consumers/PaymentFailedConsumer.cs`:
   - **STOK GERİ EKLEME:** Daha önce düşülen stokları `OrderItems` listesine bakarak geri ekler. Bu, Saga Pattern'ın "Compensating Transaction" (Telafi Edici İşlem) mekanizmasıdır.

3. **Notification.API** → `Consumers/PaymentFailedConsumer.cs`:
   - Kullanıcıya başarısız ödeme bildirimi gönderir (log ile simüle ediliyor).

---

## 7. Sipariş Durumları

| Durum | Anlamı | Nasıl Oluşur |
|-------|--------|--------------|
| **Submitted** | Sipariş alındı, işleniyor | Order oluşturulduğunda (varsayılan) |
| **Paid** | Ödeme onaylandı | `PaymentSucceededEvent` geldiğinde |
| **Failed** | Ödeme başarısız, sipariş iptal | `PaymentFailedEvent` geldiğinde |
| **StockFailed** | Stok yetersiz, sipariş iptal | `StockNotReservedEvent` geldiğinde |

---

## 8. Event Akış Diyagramı

```
                    ┌──────────────────┐
                    │  BasketCheckout  │ (Basket.API publish)
                    │     Event        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Order.API      │ Sipariş oluşturur (status: Submitted)
                    │ BasketCheckout   │
                    │   Consumer       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  OrderCreated    │ (Order.API publish)
                    │     Event        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Catalog.API     │ Stok kontrolü yapar
                    │ OrderCreated     │
                    │   Consumer       │
                    └───┬──────────┬───┘
                        │          │
               ┌────────▼──┐  ┌───▼──────────┐
               │  Stok OK  │  │ Stok Yetersiz│
               └────┬──────┘  └───┬──────────┘
                    │              │
                    ▼              ▼
          ┌─────────────┐  ┌──────────────────┐
          │StockReserved│  │StockNotReserved  │
          │   Event     │  │    Event          │
          └──────┬──────┘  └────────┬──────────┘
                 │                  │
                 ▼                  ▼
        ┌─────────────┐    ┌──────────────┐
        │ Payment.API │    │  Order.API   │
        │ StockReserved│    │ StockNotRes. │
        │  Consumer    │    │  Consumer    │
        └───┬─────┬───┘    └──────────────┘
            │     │         status→StockFailed
   ┌────────▼┐  ┌─▼────────┐
   │Ödeme OK │  │Ödeme Fail│
   └────┬────┘  └────┬─────┘
        │             │
        ▼             ▼
┌──────────────┐ ┌───────────────┐
│PaymentSucceed│ │PaymentFailed  │
│    Event     │ │    Event      │
└──────┬───────┘ └──┬─────┬─────┘
       │            │     │
       ▼            ▼     ▼
┌────────────┐ ┌────────┐ ┌───────────┐
│ Order.API  │ │Order   │ │Catalog.API│
│ status→Paid│ │→Failed │ │Stok İade  │
└────────────┘ └────────┘ └───────────┘
       │            │
       ▼            ▼
┌──────────────────────────┐
│    Notification.API      │
│ Bildirim gönderir (log)  │
└──────────────────────────┘
```

---

## 9. RabbitMQ Kuyruk Haritası

| Kuyruk Adı | Servis | Consumer | Dinlediği Event |
|------------|--------|----------|----------------|
| (otomatik) | Order.API | `BasketCheckoutConsumer` | `BasketCheckoutEvent` |
| `catalog-stock-update-queue` | Catalog.API | `OrderCreatedConsumer` | `OrderCreatedEvent` |
| `stock-reserved-queue` | Payment.API | `StockReservedConsumer` | `StockReservedEvent` |
| `order-payment-succeeded-queue` | Order.API | `PaymentSucceededConsumer` | `PaymentSucceededEvent` |
| `order-payment-failed-queue` | Order.API | `PaymentFailedConsumer` | `PaymentFailedEvent` |
| `order-stock-not-reserved-queue` | Order.API | `StockNotReservedConsumer` | `StockNotReservedEvent` |
| `notification-payment-succeeded-queue` | Notification.API | `PaymentSucceededConsumer` | `PaymentSucceededEvent` |
| `notification-payment-failed-queue` | Notification.API | `PaymentFailedConsumer` | `PaymentFailedEvent` |
| (Catalog.API — otomatik kayıt) | Catalog.API | `PaymentFailedConsumer` | `PaymentFailedEvent` |

---

## 10. Veritabanı Şeması

### CatalogDB (Catalog.API)
```
Products
├── Id              (Guid, PK)
├── Name            (string)
├── Description     (string)
├── Price           (decimal)
├── PictureUrl      (string)
├── StockQuantity   (int)
└── CreatedAt       (DateTime)
```

### OrderDb (Order.API)
```
Orders
├── Id              (Guid, PK)
├── UserName        (string)
├── TotalPrice      (decimal)
├── FirstName       (string)
├── LastName        (string)
├── EmailAddress    (string)
├── AddressLine     (string)
├── CreatedDate     (DateTime)
├── OrderStatus     (string) → "Submitted" | "Paid" | "Failed" | "StockFailed"
└── OrderItems      (1:N İlişki)

OrderItems
├── Id              (Guid, PK)
├── ProductId       (Guid)
├── ProductName     (string)
├── Price           (decimal)
├── Quantity        (int)
├── OrderId         (Guid, FK → Orders)
└── Order           (Navigation Property)
```

### IdentityDB (Identity.API)
```
AspNetUsers (IdentityUser + Ek Alanlar)
├── Id              (string, PK)
├── UserName        (string)
├── Email           (string)
├── PasswordHash    (string)
├── FirstName       (string) ← Ek alan
├── LastName        (string) ← Ek alan
└── ... (diğer Identity tabloları: Roles, Claims, Tokens vb.)
```

### Redis (Basket.API)
```
Key: {userName/userId}
Value: JSON → ShoppingCart
├── UserName        (string)
├── Items[]
│   ├── ProductId   (string)
│   ├── ProductName (string)
│   ├── Price       (decimal)
│   ├── Quantity    (int)
│   └── Color       (string)
└── TotalPrice      (hesaplanmış, Fiyat × Adet toplamı)
```

---

## 11. Loglama

Tüm servisler **Serilog** kullanır ve logları iki yere gönderir:
1. **Console** — Docker container loglarında görünür (`docker logs <container>`)
2. **Seq** — `http://localhost:5340` adresinde merkezi log arayüzü

Her servisin `appsettings.json`'ında `Properties.Application` alanı ile hangi servisten geldiği etiketlenir (örn: "Basket.API", "Order.API"). Bu sayede Seq üzerinden servise göre filtreleme yapılabilir.

---

## 12. Projeyi Çalıştırma

```bash
# Tüm servisleri ayağa kaldır
docker-compose up --build -d

# Logları izle
docker-compose logs -f

# Tek bir servisi izle
docker-compose logs -f order-api
```

**Erişim Adresleri:**

| Adres | Ne Açılır |
|-------|-----------|
| `http://localhost:3000` | Frontend (ecommerce-web) |
| `http://localhost:8000` | API Gateway |
| `http://localhost:5000/swagger` | Catalog.API Swagger |
| `http://localhost:5038/swagger` | Basket.API Swagger |
| `http://localhost:5059/swagger` | Order.API Swagger |
| `http://localhost:5001/swagger` | Identity.API Swagger |
| `http://localhost:5277/swagger` | Payment.API Swagger |
| `http://localhost:15672` | RabbitMQ Yönetim Paneli (guest/guest) |
| `http://localhost:5340` | Seq Log Arayüzü |

---

## 13. Özet: Servislerin Sorumluluk Haritası

| Servis | Yapıyor | Yayımlıyor (Publish) | Dinliyor (Consume) |
|--------|---------|----------------------|--------------------|
| **Basket.API** | Sepet CRUD, checkout başlatma | `BasketCheckoutEvent` | — |
| **Order.API** | Sipariş oluşturma, durum güncelleme | `OrderCreatedEvent` | `BasketCheckoutEvent`, `PaymentSucceededEvent`, `PaymentFailedEvent`, `StockNotReservedEvent` |
| **Catalog.API** | Ürün CRUD, stok kontrolü/düşme/iade | `StockReservedEvent`, `StockNotReservedEvent`, `ProductCreatedEvent` | `OrderCreatedEvent`, `PaymentFailedEvent` |
| **Payment.API** | Ödeme simülasyonu | `PaymentSucceededEvent`, `PaymentFailedEvent` | `StockReservedEvent` |
| **Notification.API** | Bildirim gönderme (log) | — | `PaymentSucceededEvent`, `PaymentFailedEvent` |
| **Identity.API** | Kullanıcı kaydı, JWT üretimi | — | — |
| **API Gateway** | Yönlendirme, JWT doğrulama | — | — |
