# 🚀 E-Commerce Mikroservis Mimarisi - Kapsamlı Dokümantasyon

> **Versiyon:** 1.1  
> **Son Güncelleme:** 15 Ocak 2026  
> **Hazırlayan:** AI Assistant  
> **Amaç:** Mikroservis mimarisini öğrenmek ve projeyi başkalarına anlatabilmek

---

## 📋 İçindekiler

1. [Mikroservis Mimarisi Nedir?](#1-mikroservis-mimarisi-nedir)
2. [Proje Genel Bakış](#2-proje-genel-bakış)
3. [Teknoloji Yığını (Tech Stack)](#3-teknoloji-yığını-tech-stack)
4. [Mimari Desenler (Architectural Patterns)](#4-mimari-desenler-architectural-patterns)
5. [Servisler ve Görevleri](#5-servisler-ve-görevleri)
6. [Altyapı Bileşenleri](#6-altyapı-bileşenleri)
7. [Veri Akışları ve Senaryolar](#7-veri-akışları-ve-senaryolar)
8. [Kod Yapısı ve Açıklamalar](#8-kod-yapısı-ve-açıklamalar)
9. [Nasıl Çalıştırılır?](#9-nasıl-çalıştırılır)
10. [Öğrenilen Kavramlar](#10-öğrenilen-kavramlar)

---

## 1. Mikroservis Mimarisi Nedir?

### 🎯 Temel Kavram

**Mikroservis mimarisi**, büyük bir uygulamayı **küçük, bağımsız servisler** halinde geliştirme yaklaşımıdır. Her servis:
- Kendi veritabanına sahiptir
- Bağımsız olarak deploy edilebilir
- Diğer servislerle **mesajlaşma** (messaging) ile iletişim kurar
- Tek bir göreve odaklanır (Single Responsibility Principle)

### 📊 Monolit vs Mikroservis

| **Özellik** | **Monolit** | **Mikroservis** |
|-------------|-------------|-----------------|
| **Yapı** | Tek bir büyük uygulama | Birçok küçük servis |
| **Veritabanı** | Tek merkezi DB | Her servisin kendi DB'si |
| **Deploy** | Hepsi birden | Her servis ayrı ayrı |
| **Teknoloji** | Tek dil/framework | Her servis farklı olabilir |
| **Hata Yönetimi** | Bir hata tüm sistemi durdurabilir | Bir servisteki hata diğerlerini etkilemez |
| **Ölçeklenebilirlik** | Tüm uygulama büyür | Sadece gerekli servisler büyür |

### 🧩 Örnek: E-Commerce Uygulaması

**Monolit Yaklaşım:**
```
┌─────────────────────────────────────┐
│                                     │
│    E-Commerce Uygulaması            │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Ürün Yönetimi                │  │
│  │ Sepet Yönetimi               │  │
│  │ Sipariş Yönetimi             │  │
│  │ Kullanıcı Yönetimi           │  │
│  │ Ödeme İşlemleri              │  │
│  └──────────────────────────────┘  │
│                                     │
│         Tek Veritabanı              │
└─────────────────────────────────────┘
```

**Mikroservis Yaklaşım (Bu Proje):**
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Catalog    │    │    Basket    │    │    Order     │    │   Payment    │
│   Service    │    │   Service    │    │   Service    │    │   Service    │
│              │    │              │    │              │    │              │
│  PostgreSQL  │    │    Redis     │    │  PostgreSQL  │    │   (Event    │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘    │   Listener)  │
       │                   │                   │            └──────┬───────┘
       └───────────────────┴───────────────────┴───────────────────┘
                          │
                   ┌──────▼───────┐
                   │   RabbitMQ   │
                   │  (Mesajlaşma)│
                   └──────────────┘
```

---

## 2. Proje Genel Bakış

### 🏗️ Proje Yapısı

```
ecommerce/
│
├── docker-compose.yml          # Tüm altyapı servisleri (Redis, RabbitMQ, PostgreSQL)
├── Ecommerce.slnx             # .NET Solution dosyası
│
├── src/
│   ├── BuildingBlocks/         # Ortak kullanılan kod parçaları
│   │   └── Core.Shared/
│   │       ├── Events/         # RabbitMQ mesaj şablonları
│   │       └── Behaviors/      # MediatR Pipeline (Validation)
│   │
│   ├── Services/               # Mikroservisler
│   │   ├── Catalog.API/        # Ürün Kataloğu Servisi
│   │   ├── Basket.API/         # Sepet Servisi
│   │   ├── Order.API/          # Sipariş Servisi
│   │   └── Payment.API/        # Ödeme Servisi
│   │
│   └── Clients/                # Frontend (ileride eklenecek)
│
└── data/                       # Docker Volume'ler (otomatik oluşur)
    ├── postgres/               # PostgreSQL verileri
    ├── redis/                  # Redis verileri
    └── rabbitmq/               # RabbitMQ ayarları
```

### 🎯 Projenin Amacı

Bu proje, **gerçek dünya e-commerce uygulamalarında kullanılan** mikroservis mimarisini öğrenmek için oluşturulmuştur. Aşağıdaki kavramları pratik yaparak öğreniyorsunuz:

1. **Servisler arası iletişim** (Event-Driven Architecture)
2. **Farklı veritabanı stratejileri** (PostgreSQL + Redis)
3. **CQRS Pattern** (Command Query Responsibility Segregation)
4. **Message Queue** (RabbitMQ ile asenkron iletişim)
5. **Repository Pattern** (Veri erişim soyutlaması)
6. **Validation Pipeline** (FluentValidation ile otomatik doğrulama)
7. **Docker Containerization** (Tüm servislerin container'da çalışması)

---

## 3. Teknoloji Yığını (Tech Stack)

### 🛠️ Backend Framework

**ASP.NET Core 8.0** (C#)
- Modern, hızlı, cross-platform
- Built-in Dependency Injection
- Minimal API ve MVC desteği

### 🗄️ Veritabanları

#### PostgreSQL 15
- **Kullanım Yeri:** Catalog ve Order servisleri
- **Neden PostgreSQL?** Güçlü ilişkisel veritabanı, ACID garantisi
- **Port:** 5433 (Docker)
- **Database'ler:**
  - `CatalogDB` (Ürün bilgileri)
  - `OrderDB` (Sipariş kayıtları)

#### Redis (Cache)
- **Kullanım Yeri:** Basket servisi
- **Neden Redis?** Sepet geçicidir, hızlı okuma/yazma gerekir
- **Port:** 6379
- **Veri Tipi:** Key-Value (JSON string)

### 📨 Message Broker

**RabbitMQ 3** (with Management Plugin)
- **Kullanım Yeri:** Servisler arası mesajlaşma
- **Neden RabbitMQ?** Güvenilir, asenkron, decoupled iletişim
- **Portlar:**
  - 5672: AMQP protokolü (servisler buradan bağlanır)
  - 15672: Web yönetim paneli (http://localhost:15672)
- **Kullanıcı:** guest / guest

### 🧰 Kütüphaneler ve Araçlar

| Kütüphane | Kullanım Amacı |
|-----------|----------------|
| **MediatR** | CQRS pattern için komut/sorgu yönlendirme |
| **FluentValidation** | Komutların otomatik doğrulanması |
| **MassTransit** | RabbitMQ entegrasyonu (Publish/Consume) |
| **Entity Framework Core** | PostgreSQL ile ORM (Object-Relational Mapping) |
| **StackExchange.Redis** | Redis ile iletişim |
| **Npgsql** | PostgreSQL .NET sürücüsü |
| **Swagger/OpenAPI** | API dokümantasyonu ve test |

---

## 4. Mimari Desenler (Architectural Patterns)

### 🏛️ CQRS (Command Query Responsibility Segregation)

**Ne Anlama Geliyor?**
- **Command:** Veriyi değiştiren işlemler (Create, Update, Delete)
- **Query:** Veriyi okuyan işlemler (Get, List)
- Bu ikisini **ayrı sınıflarda** tutarız

**Neden Kullanıyoruz?**
- Kod daha temiz ve okunabilir
- Okuma ve yazma işlemlerini bağımsız optimize edebiliriz
- Test etmesi kolay

**Örnek:**
```csharp
// COMMAND (Yazma İşlemi)
public record CreateProductCommand(string Name, decimal Price) : IRequest<Guid>;

// QUERY (Okuma İşlemi)
public record GetProductsQuery() : IRequest<IEnumerable<ProductDto>>;
```

### 📣 Event-Driven Architecture (Olay Güdümlü Mimari)

**Ne Anlama Geliyor?**
- Servisler birbirlerini **doğrudan çağırmaz**
- Bunun yerine **mesaj (event) gönderir**
- İlgilenen servisler bu mesajı dinler ve tepki verir

**Avantajları:**
- Servisler birbirinden bağımsız (loosely coupled)
- Bir servis çökerse diğerleri çalışmaya devam eder
- Yeni servis eklemek kolay (sadece mesajı dinlemeye başlar)

**Proje İçinde Kullanımı:**
```
1. Kullanıcı sepeti onaylar (Basket Service)
   └──> BasketCheckoutEvent mesajı RabbitMQ'ya gönderilir

2. Order Service bu mesajı dinler
   └──> Sipariş oluşturulur ve veritabanına kaydedilir
   └──> OrderCreatedEvent mesajı RabbitMQ'ya gönderilir

3. Payment Service OrderCreatedEvent'i dinler
   └──> Ödeme işlemi gerçekleştirilir
```

### 🗂️ Repository Pattern

**Ne Anlama Geliyor?**
- Veritabanı işlemlerini **soyut bir katman** arkasına gizleriz
- Controller veya Handler, veritabanının nasıl çalıştığını bilmez

**Avantajları:**
- Veritabanını değiştirmek kolaylaşır
- Test yazmak kolay (mock repository oluşturulur)
- Kod tekrarı azalır

**Örnek:**
```csharp
// Interface (Sözleşme)
public interface IBasketRepository
{
    Task<ShoppingCart> GetBasket(string userName);
    Task<ShoppingCart> UpdateBasket(ShoppingCart basket);
}

// Gerçek Uygulama (Redis ile)
public class BasketRepository : IBasketRepository
{
    private readonly IDistributedCache _redisCache;
    // Redis işlemleri burada...
}
```

### 🛡️ Pipeline Behavior (Validation)

**Ne Anlama Geliyor?**
- MediatR'da bir komut Handler'a ulaşmadan önce **ara katmanlardan** geçer
- Bu katmanlarda validation (doğrulama) yapılır
- Hata varsa Handler hiç çalışmaz

**Akış:**
```
1. Controller → MediatR.Send(command)
2. MediatR → ValidationBehavior (kontrol et)
3. Hata varsa → Exception fırlat
4. Hata yoksa → Handler'a git
5. Handler → İş mantığını çalıştır
```

---

## 5. Servisler ve Görevleri

### 🏪 Catalog.API (Ürün Kataloğu Servisi)

**Görevleri:**
- Ürün ekleme, listeleme, güncelleme
- Ürün stoğu yönetimi

**Veritabanı:** PostgreSQL (CatalogDB)

**Endpoint'ler:**
- `POST /api/products` - Yeni ürün ekle
- `GET /api/products` - Tüm ürünleri listele

**Kullandığı Teknolojiler:**
- Entity Framework Core (ORM)
- MediatR (CQRS)
- FluentValidation (Validation)
- MassTransit (Event Publishing)

**Önemli Özellikler:**
- Yeni ürün eklendiğinde `ProductCreatedEvent` mesajı RabbitMQ'ya gönderilir
- CQRS pattern kullanılır (CreateProductCommand + GetProductsQuery)
- Validator ile otomatik veri doğrulama

**Veri Modeli:**
```csharp
public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public decimal Price { get; set; }
    public string PictureUrl { get; set; }
    public int StockQuantity { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### 🛒 Basket.API (Sepet Servisi)

**Görevleri:**
- Kullanıcı sepetlerini yönetme
- Sepete ürün ekleme/çıkarma
- Sepeti onaylama (checkout)

**Veritabanı:** Redis (Key-Value Cache)

**Endpoint'ler:**
- `GET /api/basket/{userName}` - Kullanıcının sepetini getir
- `POST /api/basket` - Sepeti güncelle
- `DELETE /api/basket/{userName}` - Sepeti sil
- `POST /api/basket/checkout` - Sepeti onayla (sipariş oluştur)

**Kullandığı Teknolojiler:**
- StackExchange.Redis (Cache)
- Repository Pattern
- MassTransit (Event Publishing)

**Neden Redis?**
- Sepet geçici bir veridir (kullanıcı çıkış yapınca silinebilir)
- Çok hızlı okuma/yazma gerekir (milisaniye cinsinden)
- JSON formatında veri saklanır

**Veri Modeli:**
```csharp
public class ShoppingCart
{
    public string UserName { get; set; }
    public List<ShoppingCartItem> Items { get; set; }
    public decimal TotalPrice => Items.Sum(i => i.Price * i.Quantity);
}

public class ShoppingCartItem
{
    public int Quantity { get; set; }
    public string ProductName { get; set; }
    public decimal Price { get; set; }
}
```

**Redis'te Nasıl Saklanır?**
```json
Key: "ahmet"
Value: {
  "userName": "ahmet",
  "items": [
    {
      "quantity": 2,
      "productName": "Laptop",
      "price": 15000.00
    }
  ]
}
```

### 📦 Order.API (Sipariş Servisi)

**Görevleri:**
- Basket servisinden gelen checkout mesajlarını dinleme
- Sipariş oluşturma ve kaydetme
- Sipariş oluştuktan sonra Payment servisine bildirim gönderme

**Veritabanı:** PostgreSQL (OrderDB)

**Endpoint'ler:**
- (Şu anda endpoint yok, sadece RabbitMQ mesajı dinliyor)

**Kullandığı Teknolojiler:**
- Entity Framework Core (ORM)
- MassTransit (Event Consuming + Publishing)
- MediatR (CQRS - ileride eklenecek)

**Önemli Özellikler:**
- `BasketCheckoutConsumer` sınıfı RabbitMQ'yu dinler
- Mesaj geldiğinde otomatik sipariş oluşturur
- Sipariş oluştuktan sonra `OrderCreatedEvent` yayınlar
- Veritabanına migration otomatik uygulanır (Program.cs'de)

**Veri Modeli:**
```csharp
public class Order
{
    public Guid Id { get; set; }
    public string UserName { get; set; }
    public decimal TotalPrice { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string EmailAddress { get; set; }
    public string AddressLine { get; set; }
    public DateTime CreatedDate { get; set; }
    public List<OrderItem> OrderItems { get; set; }
}

public class OrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string ProductName { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}
```

### 💳 Payment.API (Ödeme Servisi)

**Görevleri:**
- Order servisinden gelen sipariş mesajlarını dinleme
- Ödeme işlemini gerçekleştirme (simülasyon)
- Ödeme sonucunu loglama

**Veritabanı:** (Şu anda yok, sadece event dinliyor)

**Endpoint'ler:**
- (Şu anda endpoint yok, sadece RabbitMQ mesajı dinliyor)

**Kullandığı Teknolojiler:**
- MassTransit (Event Consuming)
- Logger (Ödeme işlemlerini loglama)

**Önemli Özellikler:**
- `OrderCreatedConsumer` sınıfı RabbitMQ'yu dinler
- `order-created-queue` kuyruğundan mesaj alır
- Ödeme işlemini simüle eder (3 saniye bekleme)
- Ödeme başarı/hata durumunu loglar

**Veri Modeli:**
```csharp
// Order.API'den gelen mesaj
public class OrderCreatedEvent
{
    public Guid OrderId { get; set; }
    public string BuyerId { get; set; }
    public decimal TotalPrice { get; set; }
    public string CardName { get; set; }
    public string CardNumber { get; set; }
    public string Expiration { get; set; }
    public string CVV { get; set; }
}
```

### 🏗️ Core.Shared (Ortak Kütüphane)

**İçeriği:**
- **Events:** RabbitMQ mesaj şablonları (interface'ler ve somut sınıflar)
- **Behaviors:** MediatR Pipeline (ValidationBehavior)

**Neden Ayrı Proje?**
- Birden fazla servis aynı event'i kullanıyor
- Kod tekrarını önler
- Değişiklik yapılınca tüm servisler güncellenir

**Event'ler:**
```csharp
// Sepet onaylandığında gönderilen mesaj (Interface)
public interface BasketCheckoutEvent
{
    string UserName { get; set; }
    decimal TotalPrice { get; set; }
    string FirstName { get; set; }
    string LastName { get; set; }
    string EmailAddress { get; set; }
    string AddressLine { get; set; }
    // Kart bilgileri (Payment için)
    string CardName { get; set; }
    string CardNumber { get; set; }
    string Expiration { get; set; }
    string CVV { get; set; }
}

// Somut sınıf (MassTransit uyumluluğu için)
public class BasketCheckoutEventMessage : BasketCheckoutEvent
{
    // Tüm property'ler burada implement edilir
}

// Yeni ürün eklendiğinde gönderilen mesaj
public interface ProductCreatedEvent
{
    Guid Id { get; set; }
    string Name { get; set; }
    decimal Price { get; set; }
}
```

---

## 6. Altyapı Bileşenleri

### 🐳 Docker Compose (Konteyner Orkestrasyonu)

**docker-compose.yml Dosyası:**

```yaml
version: '3.8'

services:
  # PostgreSQL (Catalog ve Order için)
  postgres:
    image: postgres:15-alpine
    container_name: ecommerce_postgres
    environment:
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=password123
      - POSTGRES_DB=CatalogDB
    ports:
      - "5433:5432"  # Host:Container
    volumes:
      - ./data/postgres:/var/lib/postgresql/data

  # Redis (Basket için)
  redis:
    image: redis:alpine
    container_name: ecommerce_redis
    ports:
      - "6379:6379"
    volumes:
      - ./data/redis:/data

  # RabbitMQ (Mesajlaşma için)
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: ecommerce_rabbitmq
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest
    ports:
      - "5672:5672"   # AMQP protokolü
      - "15672:15672" # Yönetim paneli
    volumes:
      - ./data/rabbitmq:/var/lib/rabbitmq
```

**Komutlar:**
```bash
# Tüm servisleri başlat
docker-compose up -d

# Servislerin durumunu kontrol et
docker-compose ps

# Logları görüntüle
docker-compose logs -f

# Servisleri durdur ve sil
docker-compose down
```

### 🐘 PostgreSQL Yapılandırması

**Bağlantı Bilgileri:**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5433;Database=CatalogDB;Username=admin;Password=password123"
  }
}
```

**Catalog Database (CatalogDB):**
- **Tablo:** Products
- **Sutunlar:** Id, Name, Description, Price, PictureUrl, StockQuantity, CreatedAt

**Order Database (OrderDB):**
- **Tablolar:** Orders, OrderItems
- **İlişki:** Orders (1) ← → (N) OrderItems

**Migration Komutları:**
```bash
# Catalog servisi için migration oluştur
cd src/Services/Catalog.API
dotnet ef migrations add InitialCreate
dotnet ef database update

# Order servisi için migration oluştur
cd src/Services/Order.API
dotnet ef migrations add InitialCreate
# (Update otomatik Program.cs'de yapılıyor)
```

### 🔴 Redis Yapılandırması

**Bağlantı:**
```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379"
  }
}
```

**Kullanım Şekli:**
```csharp
// Program.cs'de kayıt
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = "localhost:6379";
});

// Repository'de kullanım
await _redisCache.SetStringAsync("ahmet", jsonData);
var data = await _redisCache.GetStringAsync("ahmet");
```

**Redis'te Veri Yapısı:**
- **Key:** Kullanıcı adı (örn: "ahmet")
- **Value:** JSON formatında ShoppingCart

### 🐰 RabbitMQ Yapılandırması

**Yönetim Paneli:**
- URL: http://localhost:15672
- Kullanıcı: guest
- Şifre: guest

**Exchange ve Queue Yapısı:**
MassTransit otomatik olarak şunları oluşturur:
- Exchange: `Core.Shared.Events:BasketCheckoutEvent`
- Queue: `Order.API_BasketCheckoutConsumer`
- Exchange: `Payment.API.Messages:OrderCreatedEvent`
- Queue: `order-created-queue` (Payment.API için özel tanımlı)

**Mesaj Akışı:**
```
1. Basket.API → Publish → RabbitMQ Exchange (BasketCheckoutEvent)
2. RabbitMQ → Queue'ya mesaj koyar
3. Order.API → Consume → Queue'dan mesaj alır
4. Order.API → Publish → RabbitMQ Exchange (OrderCreatedEvent)
5. RabbitMQ → Payment queue'ya mesaj koyar
6. Payment.API → Consume → Queue'dan mesaj alır
```

**MassTransit Konfigürasyonu:**
```csharp
builder.Services.AddMassTransit(config =>
{
    // Consumer tanımla (Order.API)
    config.AddConsumer<BasketCheckoutConsumer>();

    config.UsingRabbitMq((context, _config) =>
    {
        _config.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        // Otomatik endpoint oluştur
        _config.ConfigureEndpoints(context);
    });
});
```

---

## 7. Veri Akışları ve Senaryolar

### 📋 Senaryo 1: Yeni Ürün Ekleme

**Adımlar:**

1. **İstek:** Postman → `POST /api/products`
   ```json
   {
     "name": "iPhone 15",
     "description": "Apple akıllı telefon",
     "price": 45000,
     "pictureUrl": "https://example.com/iphone15.jpg",
     "stockQuantity": 50
   }
   ```

2. **Catalog.API → Controller**
   ```csharp
   // ProductsController.cs
   [HttpPost]
   public async Task<IActionResult> CreateProduct([FromBody] CreateProductCommand command)
   {
       var result = await _mediator.Send(command);
       return Ok(result);
   }
   ```

3. **MediatR → ValidationBehavior**
   - FluentValidation kuralları çalışır
   - Name boş mu? Price > 0 mı?
   - Hata varsa → Exception fırlat
   - Hata yoksa → Handler'a devam et

4. **CreateProductHandler → Veritabanı**
   ```csharp
   // CreateProductHandler.cs
   var product = new Product { /* ... */ };
   _context.Products.Add(product);
   await _context.SaveChangesAsync();
   ```

5. **Handler → RabbitMQ**
   ```csharp
   await _publishEndpoint.Publish<ProductCreatedEvent>(new 
   {
       Id = product.Id,
       Name = product.Name,
       Price = product.Price
   });
   ```

6. **RabbitMQ → İlgilenen Servisler**
   - Şu anda dinleyen servis yok (ileride Basket veya Notification servisi eklenebilir)

**Sonuç:** Yeni ürün hem veritabanına kaydedildi, hem de diğer servisler haberdar edildi.

---

### 🛒 Senaryo 2: Sepete Ürün Ekleme

**Adımlar:**

1. **İstek:** Postman → `POST /api/basket`
   ```json
   {
     "userName": "ahmet",
     "items": [
       {
         "quantity": 2,
         "productName": "iPhone 15",
         "price": 45000
       }
     ]
   }
   ```

2. **Basket.API → Controller**
   ```csharp
   [HttpPost]
   public async Task<IActionResult> UpdateBasket([FromBody] ShoppingCart basket)
   {
       return Ok(await _repository.UpdateBasket(basket));
   }
   ```

3. **BasketRepository → Redis**
   ```csharp
   public async Task<ShoppingCart> UpdateBasket(ShoppingCart basket)
   {
       var jsonBasket = JsonSerializer.Serialize(basket);
       await _redisCache.SetStringAsync(basket.UserName, jsonBasket);
       return basket;
   }
   ```

4. **Redis'te Saklanan Veri:**
   ```
   Key: "ahmet"
   Value: {"userName":"ahmet","items":[{"quantity":2,"productName":"iPhone 15","price":45000}]}
   ```

**Sonuç:** Ahmet'in sepeti Redis'te güncellendi. Çok hızlı (milisaniye).

---

### 📦 Senaryo 3: Sepet Onaylama (Checkout) - En Önemli Senaryo!

Bu senaryo, **mikroservis iletişiminin** tam olarak gösterildiği yerdir.

**Adımlar:**

1. **İstek:** Postman → `POST /api/basket/checkout`
   ```json
   {
     "userName": "ahmet",
     "firstName": "Ahmet",
     "lastName": "Yılmaz",
     "emailAddress": "ahmet@example.com",
     "addressLine": "İstanbul, Türkiye",
     "cardName": "Ahmet Yılmaz",
     "cardNumber": "1234567890123456",
     "expiration": "12/25",
     "cvv": "123"
   }
   ```

2. **Basket.API → Controller**
   ```csharp
   [HttpPost]
   [Route("[action]")]
   public async Task<IActionResult> Checkout([FromBody] BasketCheckout basketCheckout)
   {
       // 1. Sepeti Redis'ten getir
       var basket = await _repository.GetBasket(basketCheckout.UserName);
       
       // 2. Event mesajı oluştur (somut sınıf kullanıyoruz)
       var eventMessage = new BasketCheckoutEventMessage
       {
           UserName = basketCheckout.UserName,
           TotalPrice = basket.TotalPrice,
           FirstName = basketCheckout.FirstName,
           LastName = basketCheckout.LastName,
           EmailAddress = basketCheckout.EmailAddress,
           AddressLine = basketCheckout.AddressLine,
           // Kart bilgileri
           CardName = basketCheckout.CardName,
           CardNumber = basketCheckout.CardNumber,
           Expiration = basketCheckout.Expiration,
           CVV = basketCheckout.CVV
       };
       
       // 3. RabbitMQ'ya mesaj gönder
       await _publishEndpoint.Publish(eventMessage);
       
       // 4. Sepeti temizle
       await _repository.DeleteBasket(basketCheckout.UserName);
       
       return Accepted();
   }
   ```

3. **Basket.API → RabbitMQ**
   - MassTransit mesajı RabbitMQ'ya gönderir
   - Exchange: `Core.Shared.Events:BasketCheckoutEvent`
   - Mesaj içeriği: UserName, TotalPrice, FirstName, vb.

4. **RabbitMQ → Order.API**
   - RabbitMQ mesajı queue'ya koyar
   - Order.API'deki `BasketCheckoutConsumer` otomatik olarak mesajı yakalar

5. **BasketCheckoutConsumer → Sipariş Oluştur**
   ```csharp
   public async Task Consume(ConsumeContext<BasketCheckoutEvent> context)
   {
       var eventData = context.Message;
       
       var newOrder = new Order
       {
           Id = Guid.NewGuid(),
           UserName = eventData.UserName,
           TotalPrice = eventData.TotalPrice,
           FirstName = eventData.FirstName,
           LastName = eventData.LastName,
           EmailAddress = eventData.EmailAddress,
           AddressLine = eventData.AddressLine,
           CreatedDate = DateTime.UtcNow
       };
       
       _context.Orders.Add(newOrder);
       await _context.SaveChangesAsync();
       
       // 6. Payment servisine bildirim gönder
       var orderCreatedEvent = new OrderCreatedEvent
       {
           OrderId = newOrder.Id,
           BuyerId = newOrder.UserName,
           TotalPrice = newOrder.TotalPrice,
           CardName = eventData.CardName,
           CardNumber = eventData.CardNumber,
           Expiration = eventData.Expiration,
           CVV = eventData.CVV
       };
       
       await _publishEndpoint.Publish(orderCreatedEvent);
       
       _logger.LogInformation("Sipariş oluşturuldu: {Id}", newOrder.Id);
   }
   ```

6. **Order.API → PostgreSQL**
   - Sipariş Orders tablosuna kaydedilir

7. **Order.API → RabbitMQ**
   - `OrderCreatedEvent` mesajı RabbitMQ'ya gönderilir
   - Payment servisi bu mesajı dinler

8. **Payment.API → OrderCreatedConsumer**
   ```csharp
   public async Task Consume(ConsumeContext<OrderCreatedEvent> context)
   {
       var message = context.Message;
       
       _logger.LogInformation("ÖDEME İŞLEMİ BAŞLADI");
       _logger.LogInformation($"Sipariş ID: {message.OrderId} | Tutar: {message.TotalPrice} TL");
       _logger.LogInformation($"Kart Sahibi: {message.CardName}");
       
       // Banka simülasyonu (3 saniye bekleme)
       await Task.Delay(3000);
       
       // Ödeme kontrolü
       bool isPaymentSuccess = message.TotalPrice > 0;
       
       if (isPaymentSuccess)
       {
           _logger.LogInformation("✅ ÖDEME BAŞARIYLA ALINDI!");
       }
       else
       {
           _logger.LogError("❌ ÖDEME BAŞARISIZ!");
       }
   }
   ```

**Sonuç:**
- ✅ Sepet Redis'ten silindi
- ✅ Sipariş PostgreSQL'e kaydedildi
- ✅ Payment servisi ödeme işlemini gerçekleştirdi
- ✅ Basket, Order ve Payment servisleri birbirini tanımıyor (loose coupling)
- ✅ Asenkron işlem (kullanıcı hemen cevap aldı)

**Kritik Nokta:** Her servis sadece kendi görevine odaklanıyor! Basket → Order → Payment zinciri tamamen event-driven. Yarın yeni bir servis (örn: EmailService) eklerseniz, sadece ilgili event'i dinlemeye başlar. **Bu mikroservis mimarisinin gücüdür!**

---

### 📊 Veri Akış Diyagramı

```
┌─────────────┐
│   Postman   │
│  (Client)   │
└──────┬──────┘
       │
       │ HTTP POST /api/basket/checkout
       ▼
┌──────────────────────┐
│   Basket.API         │
│                      │
│ 1. Redis'ten sepeti   │
│    getir             │
│ 2. Event mesajı      │
│    oluştur           │
│ 3. RabbitMQ'ya gönder│
│ 4. Redis'ten sil     │
└──────┬───────────────┘
       │
       │ Publish<BasketCheckoutEvent>
       ▼
┌──────────────────────┐
│     RabbitMQ         │
│                      │
│  Exchange → Queue    │
└──────┬───────────────┘
       │
       │ Consume (Otomatik)
       ▼
┌──────────────────────┐
│   Order.API          │
│                      │
│ BasketCheckoutConsumer│
│ 1. Mesajı al         │
│ 2. Order oluştur     │
│ 3. PostgreSQL'e kaydet│
│ 4. OrderCreatedEvent │
│    gönder             │
└──────┬───────────────┘
       │
       │ Publish<OrderCreatedEvent>
       ▼
┌──────────────────────┐
│     RabbitMQ         │
│                      │
│  Exchange → Queue    │
│  (order-created-queue)│
└──────┬───────────────┘
       │
       │ Consume (Otomatik)
       ▼
┌──────────────────────┐
│   Payment.API        │
│                      │
│ OrderCreatedConsumer │
│ 1. Mesajı al         │
│ 2. Ödeme işlemi      │
│    (simülasyon)       │
│ 3. Sonucu logla      │
└──────────────────────┘
```

---

## 8. Kod Yapısı ve Açıklamalar

### 🏗️ Catalog.API Kod Yapısı

**Klasör Yapısı:**
```
Catalog.API/
├── Controllers/
│   └── ProductsController.cs       # API endpoint'leri
├── Data/
│   └── CatalogDbContext.cs         # Entity Framework DbContext
├── Entities/
│   └── Product.cs                  # Veritabanı modeli
├── Products/
│   ├── CreateProduct/
│   │   ├── CreateProductCommand.cs      # CQRS Command
│   │   ├── CreateProductHandler.cs      # Command Handler
│   │   └── CreateProductCommandValidator.cs  # FluentValidation
│   └── GetProducts/
│       ├── GetProductsQuery.cs          # CQRS Query
│       └── GetProductsHandler.cs        # Query Handler
├── Migrations/                     # EF Core migrations
├── Program.cs                      # Uygulama başlangıcı
└── appsettings.json               # Yapılandırma dosyası
```

**Önemli Kod Parçaları:**

#### Program.cs (Dependency Injection)
```csharp
// 1. PostgreSQL Bağlantısı
builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. MediatR (CQRS için)
builder.Services.AddMediatR(cfg => 
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));  // Validation Pipeline
});

// 3. FluentValidation (Validatorları otomatik bul)
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);

// 4. MassTransit (RabbitMQ)
builder.Services.AddMassTransit(config =>
{
    config.UsingRabbitMq((context, _config) =>
    {
        _config.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });
    });
});
```

#### ProductsController.cs (API Katmanı)
```csharp
[Route("api/[controller]")]
[ApiController]
public class ProductsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // Ürün oluşturma
    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductCommand command)
    {
        var result = await _mediator.Send(command);  // MediatR'a gönder
        return Ok(result);
    }

    // Ürünleri listeleme
    [HttpGet]
    public async Task<IActionResult> GetProducts()
    {
        var result = await _mediator.Send(new GetProductsQuery());
        return Ok(result);
    }
}
```

**Not:** Controller'da iş mantığı yok! Sadece MediatR'a yönlendirme var. Bu **Clean Architecture** prensibidir.

#### CreateProductHandler.cs (İş Mantığı)
```csharp
public class CreateProductHandler : IRequestHandler<CreateProductCommand, Guid>
{
    private readonly CatalogDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;

    public CreateProductHandler(CatalogDbContext context, IPublishEndpoint publishEndpoint)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
    }

    public async Task<Guid> Handle(CreateProductCommand command, CancellationToken cancellationToken)
    {
        // 1. Product entity'si oluştur
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = command.Name,
            Description = command.Description,
            Price = command.Price,
            PictureUrl = command.PictureUrl,
            StockQuantity = command.StockQuantity
        };

        // 2. Veritabanına kaydet
        _context.Products.Add(product);
        await _context.SaveChangesAsync(cancellationToken);

        // 3. RabbitMQ'ya event gönder
        await _publishEndpoint.Publish<ProductCreatedEvent>(new 
        {
            Id = product.Id,
            Name = product.Name,
            Price = product.Price,
            StockQuantity = product.StockQuantity
        }, cancellationToken);

        // 4. Ürün ID'sini geri dön
        return product.Id;
    }
}
```

#### CreateProductCommandValidator.cs (Doğrulama)
```csharp
public class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün adı boş olamaz.")
            .Length(2, 150).WithMessage("Ürün adı 2 ile 150 karakter arasında olmalıdır.");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Fiyat 0'dan büyük olmalıdır.");

        RuleFor(x => x.StockQuantity)
            .GreaterThanOrEqualTo(0).WithMessage("Stok negatif olamaz.");
            
        RuleFor(x => x.PictureUrl)
            .NotEmpty().WithMessage("Resim yolu gereklidir.");
    }
}
```

**Not:** Bu validator, ValidationBehavior tarafından otomatik çalıştırılır!

---

### 🛒 Basket.API Kod Yapısı

**Klasör Yapısı:**
```
Basket.API/
├── Controllers/
│   └── BasketController.cs         # API endpoint'leri
├── Entities/
│   ├── ShoppingCart.cs             # Sepet modeli
│   ├── ShoppingCartItem.cs         # Sepet ürünü
│   └── BasketCheckout.cs           # Checkout DTO
├── Repositories/
│   ├── IBasketRepository.cs        # Repository interface
│   └── BasketRepository.cs         # Redis implementasyonu
├── Program.cs
└── appsettings.json
```

**Önemli Kod Parçaları:**

#### BasketRepository.cs (Redis İşlemleri)
```csharp
public class BasketRepository : IBasketRepository
{
    private readonly IDistributedCache _redisCache;

    public BasketRepository(IDistributedCache redisCache)
    {
        _redisCache = redisCache;
    }

    // Sepeti getir
    public async Task<ShoppingCart> GetBasket(string userName)
    {
        var basket = await _redisCache.GetStringAsync(userName);
        
        if (String.IsNullOrEmpty(basket))
            return null;
        
        return JsonSerializer.Deserialize<ShoppingCart>(basket);
    }

    // Sepeti güncelle
    public async Task<ShoppingCart> UpdateBasket(ShoppingCart basket)
    {
        var jsonBasket = JsonSerializer.Serialize(basket);
        await _redisCache.SetStringAsync(basket.UserName, jsonBasket);
        return await GetBasket(basket.UserName);
    }

    // Sepeti sil
    public async Task DeleteBasket(string userName)
    {
        await _redisCache.RemoveAsync(userName);
    }
}
```

**Kritik Nokta:** Redis işlemleri çok basit:
- `SetStringAsync` → Veriyi yaz
- `GetStringAsync` → Veriyi oku
- `RemoveAsync` → Veriyi sil

#### BasketController.cs (Checkout Endpoint'i)
```csharp
[Route("api/[controller]")]
[ApiController]
public class BasketController : ControllerBase
{
    private readonly IBasketRepository _repository;
    private readonly IPublishEndpoint _publishEndpoint;

    public BasketController(IBasketRepository repository, IPublishEndpoint publishEndpoint)
    {
        _repository = repository;
        _publishEndpoint = publishEndpoint;
    }

    // Sepeti onayla (en önemli endpoint)
    [Route("[action]")]
    [HttpPost]
    public async Task<IActionResult> Checkout([FromBody] BasketCheckout basketCheckout)
    {
        // 1. Sepeti Redis'ten getir
        var basket = await _repository.GetBasket(basketCheckout.UserName);
        if (basket == null)
            return BadRequest("Sepet bulunamadı!");

        // 2. Event mesajını oluştur (somut sınıf kullanıyoruz)
        var eventMessage = new BasketCheckoutEventMessage
        {
            UserName = basketCheckout.UserName,
            TotalPrice = basket.TotalPrice,
            FirstName = basketCheckout.FirstName,
            LastName = basketCheckout.LastName,
            EmailAddress = basketCheckout.EmailAddress,
            AddressLine = basketCheckout.AddressLine,
            CardName = basketCheckout.CardName,
            CardNumber = basketCheckout.CardNumber,
            Expiration = basketCheckout.Expiration,
            CVV = basketCheckout.CVV
        };

        // 3. RabbitMQ'ya gönder
        await _publishEndpoint.Publish(eventMessage);

        // 4. Sepeti temizle
        await _repository.DeleteBasket(basketCheckout.UserName);

        return Accepted();  // 202 status code
    }
}
```

**Not:** `Accepted()` (202) dönüyoruz çünkü sipariş asenkron olarak oluşturulacak.

---

### 📦 Order.API Kod Yapısı

**Klasör Yapısı:**
```
Order.API/
├── Consumers/
│   └── BasketCheckoutConsumer.cs   # RabbitMQ mesaj dinleyici
├── Data/
│   └── OrderDbContext.cs           # Entity Framework DbContext
├── Entities/
│   ├── Order.cs                    # Sipariş modeli
│   └── OrderItem.cs                # Sipariş ürünü
├── Migrations/                     # EF Core migrations
├── Program.cs
└── appsettings.json
```

**Önemli Kod Parçaları:**

#### BasketCheckoutConsumer.cs (Event Listener)
```csharp
public class BasketCheckoutConsumer : IConsumer<BasketCheckoutEvent>
{
    private readonly OrderDbContext _context;
    private readonly ILogger<BasketCheckoutConsumer> _logger;

    public BasketCheckoutConsumer(OrderDbContext context, ILogger<BasketCheckoutConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<BasketCheckoutEvent> context)
    {
        // 1. Gelen mesajı al
        var eventData = context.Message;
        
        _logger.LogInformation("Yeni Sipariş Mesajı Geldi! Kullanıcı: {UserName}", eventData.UserName);

        // 2. Sipariş oluştur
        var newOrder = new Order
        {
            Id = Guid.NewGuid(),
            UserName = eventData.UserName,
            TotalPrice = eventData.TotalPrice,
            FirstName = eventData.FirstName,
            LastName = eventData.LastName,
            EmailAddress = eventData.EmailAddress,
            AddressLine = eventData.AddressLine,
            CreatedDate = DateTime.UtcNow
        };

        // 3. Veritabanına kaydet
        _context.Orders.Add(newOrder);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Sipariş başarıyla veritabanına kaydedildi. ID: {Id}", newOrder.Id);
    }
}
```

**Kritik Nokta:**
- Bu sınıf `IConsumer<BasketCheckoutEvent>` implement ediyor
- MassTransit otomatik olarak RabbitMQ'ya bağlanır ve mesajları dinler
- Mesaj geldiğinde `Consume` metodu çalışır

#### Program.cs (Consumer Kaydı)
```csharp
builder.Services.AddMassTransit(config =>
{
    // Consumer'ı tanıt
    config.AddConsumer<BasketCheckoutConsumer>();

    config.UsingRabbitMq((context, _config) =>
    {
        _config.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        // Otomatik endpoint yapılandırması (ÇOK ÖNEMLİ!)
        _config.ConfigureEndpoints(context);
    });
});
```

**Not:** `ConfigureEndpoints(context)` satırı olmazsa Consumer çalışmaz!

---

### 💳 Payment.API Kod Yapısı

**Klasör Yapısı:**
```
Payment.API/
├── Consumers/
│   └── OrderCreatedConsumer.cs   # RabbitMQ mesaj dinleyici
├── Messages/
│   └── OrderCreatedEvent.cs      # Sipariş oluşturuldu event'i
├── Program.cs
└── appsettings.json
```

**Önemli Kod Parçaları:**

#### OrderCreatedConsumer.cs (Event Listener)
```csharp
public class OrderCreatedConsumer : IConsumer<OrderCreatedEvent>
{
    private readonly ILogger<OrderCreatedConsumer> _logger;

    public OrderCreatedConsumer(ILogger<OrderCreatedConsumer> logger)
    {
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCreatedEvent> context)
    {
        var message = context.Message;
        
        _logger.LogInformation("--- ÖDEME İŞLEMİ BAŞLADI ---");
        _logger.LogInformation($"Sipariş ID: {message.OrderId} | Tutar: {message.TotalPrice} TL");
        _logger.LogInformation($"Kart Sahibi: {message.CardName}");

        // Banka simülasyonu (3 saniye bekleyelim)
        await Task.Delay(3000); 

        // Basit bir kural: Tutar negatif değilse ödeme başarılı
        bool isPaymentSuccess = message.TotalPrice > 0;

        if (isPaymentSuccess)
        {
            _logger.LogInformation("✅ ÖDEME BAŞARIYLA ALINDI! Bankadan onay geldi.");
        }
        else
        {
            _logger.LogError("❌ ÖDEME BAŞARISIZ! Bakiye yetersiz.");
        }
    }
}
```

#### Program.cs (Consumer Kaydı)
```csharp
builder.Services.AddMassTransit(config =>
{
    // Consumer'ı tanıt
    config.AddConsumer<OrderCreatedConsumer>();

    config.UsingRabbitMq((ctx, cfg) =>
    {
        cfg.Host("amqp://guest:guest@localhost:5672");

        // Özel queue adı tanımla
        cfg.ReceiveEndpoint("order-created-queue", c =>
        {
            c.ConfigureConsumer<OrderCreatedConsumer>(ctx);
        });
    });
});
```

**Kritik Nokta:**
- Payment.API, `order-created-queue` adında özel bir queue kullanıyor
- Order.API'den gelen `OrderCreatedEvent` mesajlarını dinliyor
- Ödeme işlemini simüle ediyor (gerçek banka entegrasyonu ileride eklenecek)

---

### 🏗️ Core.Shared Kod Yapısı

**Klasör Yapısı:**
```
Core.Shared/
├── Events/
│   ├── BasketCheckoutEvent.cs         # Sepet onay event'i (interface)
│   ├── BasketCheckoutEventMessage.cs  # Sepet onay event'i (somut sınıf)
│   └── ProductCreatedEvent.cs        # Ürün oluşturma event'i
└── Behaviors/
    └── ValidationBehavior.cs           # MediatR Pipeline
```

#### ValidationBehavior.cs (Otomatik Doğrulama)
```csharp
public class ValidationBehavior<TRequest, TResponse> 
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        // 1. Validator var mı kontrol et
        if (!_validators.Any())
            return await next();  // Yoksa devam

        // 2. Validation context oluştur
        var context = new ValidationContext<TRequest>(request);

        // 3. Tüm validatorları çalıştır
        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        // 4. Hataları topla
        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        // 5. Hata varsa exception fırlat
        if (failures.Any())
            throw new ValidationException(failures);

        // 6. Sorun yoksa devam et
        return await next();
    }
}
```

**Nasıl Çalışır?**
```
Request → ValidationBehavior → Validator → Hata var mı?
                                             ├── EVET → Exception
                                             └── HAYIR → Handler
```

---

## 9. Nasıl Çalıştırılır?

### 🚀 Adım Adım Kurulum

#### 1. Ön Gereksinimler
```bash
# .NET 8.0 SDK
dotnet --version  # 8.0.x olmalı

# Docker Desktop (Windows/Mac) veya Docker Engine (Linux)
docker --version
docker-compose --version
```

#### 2. Altyapı Servislerini Başlat
```bash
# Proje dizinine git
cd /Users/dijicrea/Desktop/ecommerce

# Docker Compose ile servisleri başlat
docker-compose up -d

# Servislerin çalıştığını kontrol et
docker-compose ps

# Beklenen Çıktı:
# NAME                    STATUS
# ecommerce_postgres      Up
# ecommerce_redis         Up
# ecommerce_rabbitmq      Up
```

#### 3. Veritabanı Migration'larını Uygula

**Catalog.API için:**
```bash
cd src/Services/Catalog.API
dotnet ef database update
```

**Order.API için:**
```bash
cd src/Services/Order.API
# (Migration otomatik uygulanıyor Program.cs'de)
```

#### 4. Servisleri Çalıştır

**Yöntem 1: Her servisi ayrı terminalde**
```bash
# Terminal 1 - Catalog.API
cd src/Services/Catalog.API
dotnet run

# Terminal 2 - Basket.API
cd src/Services/Basket.API
dotnet run

# Terminal 3 - Order.API
cd src/Services/Order.API
dotnet run

# Terminal 4 - Payment.API
cd src/Services/Payment.API
dotnet run
```

**Yöntem 2: Visual Studio / Rider**
- Solution'ı aç
- Birden fazla startup project ayarla
- F5 ile başlat

#### 5. Swagger'ı Aç

Tarayıcıda şu URL'leri aç:
- Catalog API: http://localhost:5171/swagger
- Basket API: http://localhost:5172/swagger
- Order API: http://localhost:5173/swagger
- Payment API: http://localhost:5174/swagger

**Not:** Port numaraları `launchSettings.json` dosyasında tanımlanmıştır.

#### 6. RabbitMQ Yönetim Panelini Aç

URL: http://localhost:15672
- Kullanıcı: `guest`
- Şifre: `guest`

Burada exchange'leri, queue'ları ve mesajları görebilirsiniz.

---

### 🧪 Test Senaryoları (Postman)

#### Test 1: Yeni Ürün Ekle

```http
POST http://localhost:5171/api/products
Content-Type: application/json

{
  "name": "iPhone 15 Pro",
  "description": "Apple akıllı telefon",
  "price": 55000,
  "pictureUrl": "https://example.com/iphone15.jpg",
  "stockQuantity": 100
}
```

**Beklenen Sonuç:**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

#### Test 2: Ürünleri Listele

```http
GET http://localhost:5171/api/products
```

**Beklenen Sonuç:**
```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "iPhone 15 Pro",
    "description": "Apple akıllı telefon",
    "price": 55000,
    "pictureUrl": "https://example.com/iphone15.jpg",
    "stockQuantity": 100
  }
]
```

#### Test 3: Sepete Ürün Ekle

```http
POST http://localhost:5172/api/basket
Content-Type: application/json

{
  "userName": "ahmet",
  "items": [
    {
      "quantity": 2,
      "productName": "iPhone 15 Pro",
      "price": 55000
    }
  ]
}
```

**Beklenen Sonuç:**
```json
{
  "userName": "ahmet",
  "items": [
    {
      "quantity": 2,
      "productName": "iPhone 15 Pro",
      "price": 55000
    }
  ]
}
```

#### Test 4: Sepeti Getir

```http
GET http://localhost:5172/api/basket/ahmet
```

#### Test 5: Sepeti Onayla (Sipariş Oluştur ve Ödeme)

```http
POST http://localhost:5172/api/basket/checkout
Content-Type: application/json

{
  "userName": "ahmet",
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "emailAddress": "ahmet@example.com",
  "addressLine": "İstanbul, Türkiye",
  "cardName": "Ahmet Yılmaz",
  "cardNumber": "1234567890123456",
  "expiration": "12/25",
  "cvv": "123"
}
```

**Beklenen Sonuç:**
- HTTP Status: 202 Accepted
- Order.API loglarında "Yeni Sipariş Mesajı Geldi!" yazısı
- Order.API loglarında "OrderCreatedEvent fırlatıldı!" yazısı
- Payment.API loglarında "ÖDEME İŞLEMİ BAŞLADI" yazısı
- Payment.API loglarında "Kart Sahibi: Ahmet Yılmaz" yazısı
- Payment.API loglarında "✅ ÖDEME BAŞARIYLA ALINDI!" yazısı
- OrderDB'de yeni sipariş kaydı

#### Test 6: Sipariş Kontrolü

PostgreSQL'e bağlan ve kontrol et:
```sql
-- pgAdmin veya psql ile
SELECT * FROM "Orders";
```

---

### 🔍 Hata Ayıklama (Troubleshooting)

#### Sorun 1: "Cannot connect to Redis"
**Çözüm:**
```bash
# Redis çalışıyor mu?
docker ps | grep redis

# Redis loglarını kontrol et
docker logs ecommerce_redis

# Redis'e manuel bağlan
docker exec -it ecommerce_redis redis-cli
> PING
# "PONG" dönmeli
```

#### Sorun 2: "Cannot connect to PostgreSQL"
**Çözüm:**
```bash
# PostgreSQL çalışıyor mu?
docker ps | grep postgres

# Veritabanına bağlan
docker exec -it ecommerce_postgres psql -U admin -d CatalogDB
```

#### Sorun 3: "Consumer çalışmıyor"
**Çözüm:**
- `ConfigureEndpoints(context)` satırı var mı?
- RabbitMQ'da queue oluşmuş mu? (http://localhost:15672/queues)
- Order.API loglarında "Consumer registered" yazısı var mı?

#### Sorun 4: "Migration hatası"
**Çözüm:**
```bash
# Migration dosyalarını sil ve yeniden oluştur
cd src/Services/Catalog.API
rm -rf Migrations/
dotnet ef migrations add InitialCreate
dotnet ef database update
```

---

## 10. Öğrenilen Kavramlar

### ✅ Mikroservis Mimarisi
- [x] Servisler arası bağımsızlık (loose coupling)
- [x] Her servisin kendi veritabanı (database per service)
- [x] Asenkron iletişim (message queue)
- [x] Polyglot persistence (farklı veritabanı tipleri)

### ✅ Event-Driven Architecture
- [x] Event Publishing (MassTransit)
- [x] Event Consuming (Consumer pattern)
- [x] RabbitMQ Exchange & Queue
- [x] Eventual Consistency (nihai tutarlılık)

### ✅ CQRS Pattern
- [x] Command (yazma işlemleri)
- [x] Query (okuma işlemleri)
- [x] MediatR kullanımı
- [x] Handler pattern

### ✅ Repository Pattern
- [x] Data access abstraction
- [x] Interface-based design
- [x] Redis implementation

### ✅ Validation
- [x] FluentValidation
- [x] Pipeline Behavior
- [x] Otomatik doğrulama

### ✅ Docker & DevOps
- [x] Docker Compose
- [x] Container yönetimi
- [x] Volume kullanımı
- [x] Port mapping

### ✅ .NET Core
- [x] Dependency Injection
- [x] Entity Framework Core
- [x] Minimal API
- [x] Configuration management

---

## 🎯 Sonraki Adımlar (Gelecek Özellikler)

### 1. API Gateway
- [ ] Ocelot veya YARP ekle
- [ ] Tek giriş noktası oluştur
- [ ] Rate limiting

### 2. Authentication & Authorization
- [ ] IdentityServer4 veya Duende
- [ ] JWT Token
- [ ] Role-based access

### 3. Frontend
- [ ] React veya Angular
- [ ] SignalR (real-time bildirimleri)

### 4. Monitoring & Logging
- [ ] Elasticsearch, Logstash, Kibana (ELK)
- [ ] Serilog
- [ ] Health Checks

### 5. Resilience
- [ ] Retry Policy (Polly)
- [ ] Circuit Breaker
- [ ] Timeout handling

### 6. Testing
- [ ] Unit Tests (xUnit)
- [ ] Integration Tests
- [ ] Load Testing (k6)

### 7. CI/CD
- [ ] GitHub Actions
- [ ] Docker Hub
- [ ] Kubernetes deployment

---

## 📚 Kaynaklar ve Referanslar

### Dokümantasyonlar
- [ASP.NET Core Documentation](https://docs.microsoft.com/en-us/aspnet/core/)
- [MassTransit Documentation](https://masstransit-project.com/)
- [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)

### Mimari Desenler
- [Microservices Pattern - Chris Richardson](https://microservices.io/)
- [CQRS Pattern - Martin Fowler](https://martinfowler.com/bliki/CQRS.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

### Video Kaynaklar
- [.NET Microservices Architecture](https://dotnet.microsoft.com/learn/aspnet/microservices-architecture)
- [RabbitMQ Crash Course](https://www.youtube.com/results?search_query=rabbitmq+crash+course)

---

## 💡 Önemli Notlar

### ⚠️ Production'a Geçerken Dikkat Edilecekler

1. **Güvenlik:**
   - Şifreleri environment variable'lara taşı
   - HTTPS kullan
   - API Key/JWT ekle

2. **Performans:**
   - Redis cache stratejisi belirle
   - Database indexleme
   - Connection pooling

3. **Hata Yönetimi:**
   - Global exception handler ekle
   - Logging ekle (Serilog)
   - Retry policy (Polly)

4. **Monitoring:**
   - Health check endpoint'leri ekle
   - Prometheus/Grafana entegrasyonu
   - Alert sistemi

5. **Deployment:**
   - Kubernetes kullan
   - Load balancer ekle
   - Auto-scaling yapılandır

---

## 🤝 Katkıda Bulunma

Bu proje eğitim amaçlıdır. İyileştirme önerileri için:
1. Issue aç
2. Pull request gönder
3. Dokümantasyonu güncelle

---

## 📝 Değişiklik Geçmişi

### Versiyon 1.1 (15 Ocak 2026)
- ✅ Payment.API servisi eklendi
- ✅ Order.API'den Payment.API'ye event akışı kuruldu
- ✅ BasketCheckoutEvent'e kart bilgileri eklendi
- ✅ BasketCheckoutEventMessage somut sınıfı oluşturuldu (MassTransit uyumluluğu)
- ✅ Ödeme işlemi simülasyonu eklendi

### Versiyon 1.0 (14 Ocak 2026)
- ✅ İlk mikroservis mimarisi kuruldu
- ✅ Catalog, Basket, Order servisleri eklendi
- ✅ RabbitMQ entegrasyonu tamamlandı
- ✅ CQRS pattern uygulandı
- ✅ Docker Compose yapılandırıldı
- ✅ Validation pipeline eklendi

---

## 🙏 Teşekkürler

Bu projeyi geliştirirken öğrendiğim her şey için...

**Hazırlayan:** AI Assistant  
**İletişim:** [GitHub](https://github.com) | [LinkedIn](https://linkedin.com)  
**Lisans:** MIT

---

**⭐ Bu dokümantasyon faydalı olduysa, projeye yıldız vermeyi unutmayın!**

