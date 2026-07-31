# Laravel Gözüyle E-Ticaret Sistemi

Bu not, .NET mikroservis projesini Laravel alışkanlıklarınla eşleştirir.
Her bölüm kısa tutulur; sırayla ilerlenir.

---

## Parça 1 — Büyük resim: Monolit vs bu sistem

### Laravel'de ne yapıyorsun?
Tek uygulama (`app/`), tek `routes/`, tek veritabanı, tek `php artisan serve`.
Controller → Service → Eloquent → MySQL. Her şey aynı projede.

### Burada ne var?
Aynı iş **birden fazla küçük uygulama**ya bölünmüş. Her biri kendi işine bakar,
kendi veritabanına yazar. Birbirleriyle HTTP ve kuyruk (RabbitMQ) ile konuşur.

| Laravel (monolit) | Bu sistem |
|-------------------|-----------|
| Tek `laravel` projesi | Birçok servis (Identity, Catalog, Basket, Order…) |
| `routes/web.php` + `api.php` | Her servisin kendi API'si + önde **API Gateway** |
| Tek MySQL | Birkaç Postgres DB (`CatalogDb`, `OrderDb`…) |
| `dispatch(Job)` / queue | **RabbitMQ** + event consumer'lar |
| Blade / Inertia | **Next.js** vitrin + ayrı admin panel |
| `.env` | Servis başına ayar + Docker / Gateway |

### Akış (sipariş örneği — Laravel gibi düşün)
```
Müşteri (Next.js)
    → API Gateway          ≈ nginx / api prefix
    → Basket "checkout"    ≈ CartController@checkout
    → event yayınla        ≈ OrderPlaced::dispatch()
    → Order servisi dinler ≈ ShouldQueue listener
    → Payment / Catalog…   ≈ diğer listener'lar
```

### Neden böyle?
- Bir parçayı (ör. katalog) diğerini bozmadan büyütmek
- Takımlar / deploy bağımsızlığı
- Bedeli: Laravel'deki “her şey tek yerde” kolaylığı azalır; servisler arası sözleşme gerekir

### Bu parçanın özeti
> Laravel = tek mutfak.  
> Bu sistem = her bölümün (kasa, depo, kargo) ayrı tezgahı; siparişler tezgahlar arası fişle (event) gider.

**Sonraki parça:** API Gateway ≈ Laravel’deki `RouteServiceProvider` + reverse proxy.

---

## Parça 2 — API Gateway (tek kapı)

### Laravel'de karşılığı
- `routes/api.php` + `RouteServiceProvider` → URL’yi doğru controller’a yollar
- Önde nginx / Apache → tek domain, arkada PHP-FPM
- Middleware grubu (`auth:sanctum`, `throttle`) → istek gelmeden kontrol

Gateway = **nginx reverse proxy + ortak middleware katmanı**. İş kuralı yazmaz; yönlendirir ve korur.

### Ne işe yarar?
Tarayıcı / Next.js **tek adres**e vurur (`localhost:8001` veya `api.domain.com`).
Gateway path’e bakıp doğru mikroservise iletir:

```
GET  /catalog/products     → Catalog.API
POST /auth/login           → Identity.API
GET  /basket/{userId}      → Basket.API
GET  /orders/...           → Order.API
POST /basket/checkout      → Basket.API
```

Laravel benzetmesi:
```php
// Tek API host
Route::prefix('catalog')->group(...); // aslında başka servis
Route::prefix('auth')->group(...);    // başka servis
```

Config burada: `src/API.Gateway/appsettings.json` → `ReverseProxy:Routes`.

### Gateway’de ekstra (Laravel middleware gibi)
Bu projede Gateway aynı zamanda:
- **CORS** — hangi front’ların çağırabileceği
- **Rate limit** — brute force / spam (`throttle` gibi)
- **JWT / auth** ayarları — bazı rotalarda token beklenir
- **Health** — `/health` (load balancer kontrolü)

İş mantığı (ürün ekle, sipariş oluştur) **Gateway’de değil**; Catalog / Basket / Order’da.

### Akış
```
Next.js  →  API Gateway (:8001)  →  ilgili servis (:iç port)
                 ↑
         tek dış kapı (CORS, limit, route)
```

Docker’da servisler birbirini hostname ile görür (`catalog-api`, `identity-api`…).
Tarayıcı sadece Gateway’i bilir — Laravel’de public’e sadece nginx açmak gibi.

### Bu parçanın özeti
> Gateway = binanın resepsiyonu.  
> “Katalog mu, sipariş mi?” diye sorar, ilgili kata yönlendirir; ürün raftan kendi almaz.

**Sonraki parça:** Identity.API ≈ Laravel `User` + Sanctum/Passport + auth routes.

---

## Parça 3 — (sonra)
## Parça 4 — (sonra)
## Parça 5 — (sonra)
## Parça 6 — (sonra)
## Parça 7 — (sonra)
