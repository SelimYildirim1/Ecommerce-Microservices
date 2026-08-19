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

**Sonraki parça:** .NET nasıl çalışır — `Program.cs`, DI, ayarlar, C# sözdizimi.

---

## Parça 3 — .NET nasıl çalışır (Laravel alışkanlıklarınla)

Bu sistem C# / **ASP.NET Core 8** ile yazılmış. Laravel değil; ama aynı işleri farklı dosyalarda yapıyor.
Her mikroservis (Identity, Catalog, Order…) **kendi küçük Laravel’i** gibi: kendi `Program.cs`, kendi controller’ları, kendi `appsettings.json`.

### Laravel’de uygulama nasıl ayağa kalkar?
```
php artisan serve
  → public/index.php
  → bootstrap/app.php + Kernel
  → service provider’lar register
  → middleware pipeline
  → routes/*.php → Controller
```

### Burada karşılığı
```
dotnet run   (veya Docker container start)
  → Program.cs          ≈ index.php + Kernel + AppServiceProvider
  → builder.Services…   ≈ container’a bağlama (singleton/bind)
  → app.UseXxx()        ≈ $middleware pipeline (sıra önemli)
  → MapControllers()    ≈ routes/api.php’yi yükle
  → app.Run()           ≈ dinlemeye başla
```

`php artisan serve` ≈ `dotnet run`.  
`composer.json` ≈ `*.csproj` (NuGet paketleri).  
`vendor/` ≈ derlenmiş DLL’ler (restore + build).

---

### `Program.cs` ne işe yarar?

İki yarıdan oluşur. Laravel’de dağınık duran şeyler burada **tek dosyada**.

**1) Kutu doldurma (DI / service container)** — `var builder = WebApplication.CreateBuilder(args);` sonrası:

| Bu satır (Identity örneği) | Laravel karşılığı |
|----------------------------|-------------------|
| `AddControllers()` | `routes/api.php` + controller keşfi |
| `AddDbContext<…>(UseNpgsql(…))` | `config/database.php` + Eloquent bağlama |
| `AddIdentity<ApplicationUser, …>()` | `User` model + Hash + Auth |
| `AddAuthentication().AddJwtBearer(…)` | Sanctum/Passport JWT ayarı |
| `AddAuthorization(… policy …)` | Gate / Policy |
| `AddMassTransit(… RabbitMQ …)` | `QUEUE_CONNECTION=rabbitmq` |
| `builder.Configuration["JwtSettings:Secret"]` | `env('JWT_SECRET')` |

Constructor’da istediğin sınıfı parametre olarak yazarsın; .NET onu kutudan verir. Laravel’deki constructor injection ile aynı fikir:

```csharp
// Laravel: public function __construct(UserManager $users)
public AuthController(UserManager<ApplicationUser> userManager) { … }
```

**2) Boru hattı (middleware)** — `var app = builder.Build();` sonrası, **yazıldıkları sırayla** çalışır:

```
istek
  → UseAuthentication()   ≈ Auth middleware (token oku)
  → UseRateLimiter()      ≈ throttle
  → UseAuthorization()    ≈ can: / policies
  → MapControllers()      ≈ route → action
  → cevap
```

Sıra önemli: Laravel Kernel’de `auth`’u `can`’den önce koymak gibi. Auth, Authorization’dan **önce** olmalı.

Son satır `app.Run();` = “dinle, çıkma”. `php artisan serve`’in process’i gibi.

Ayrıca Identity’de `Build()` sonrası `Migrate()` + `IdentitySeeder` çalışır ≈ `php artisan migrate` + `DatabaseSeeder` (ama her açılışta, otomatik).

---

### Bir istek nasıl ilerler? (login örneği)

```
POST /auth/login          (tarayıcı / Next.js)
  → API Gateway :8001     path’e bak, Identity’ye ilet
  → Identity /api/auth/login
       Program.cs pipeline (auth, rate limit)
       AuthController.Login  ← [HttpPost("login")]
         UserManager.FindByEmailAsync
         şifre kontrol
         JWT üret
       return Ok({ token, roles })
  → Next.js token’ı saklar (localStorage / cookie)
  → sonraki istekler: Authorization: Bearer <token>
```

Laravel Sanctum’da çoğu zaman cookie + session. Burada **stateless JWT**: sunucu oturum tutmaz; token’ın içindeki claim’lere (user id, role) bakar.

---

### Ayarlar nerede? (`.env` karşılığı)

Laravel tek `.env`. .NET **katmanlı config**: sonra gelen ezer.

```
1. appsettings.json                         ≈ .env.example + config/*.php varsayılan
2. appsettings.{Environment}.json           ≈ .env.local / .env.production
3. Ortam değişkenleri (Docker / .env)       ≈ asıl .env  — secret buraya
4. launchSettings.json (sadece lokal IDE)   ≈ php artisan serve portu
```

Okuma:

```csharp
builder.Configuration["JwtSettings:Secret"]
builder.Configuration.GetConnectionString("DefaultConnection")
```

JSON iç içe anahtar, env’de `__` (çift alt çizgi) olur:

| JSON | Ortam değişkeni |
|------|-----------------|
| `JwtSettings:Secret` | `JwtSettings__Secret` |
| `ConnectionStrings:DefaultConnection` | `ConnectionStrings__DefaultConnection` |
| `RabbitMQ:HostName` | `RabbitMQ__HostName` |

Bu projedeki yerler:

| Ne | Nerede |
|----|--------|
| Servis varsayılanları | `src/Services/Identity.API/appsettings.json` (her serviste kendi) |
| Gateway rotaları | `src/API.Gateway/appsettings.json` → `ReverseProxy` |
| Docker override | `docker-compose.yml` → `environment:` |
| Prod secret örneği | kök `.env.example` → kopyala `.env` (commit etme) |
| Ortam adı | `ASPNETCORE_ENVIRONMENT=Development` / `Production` ≈ `APP_ENV` |

`IsDevelopment()` / `IsProduction()` ≈ `app()->environment('local')`.  
Identity’de Production’da şifre kuralları sıkı, Development’ta gevşek — bu yüzden.

Lokal `dotnet run`: `appsettings.json` + `appsettings.Development.json`, connection `localhost`.  
Docker: compose `ConnectionStrings__DefaultConnection=…postgres-db…` ile ezer — container içinden `localhost` Postgres’e gitmez.

---

### C# sözdizimi — Laravel’den bakınca

PHP dinamik; C# **derlenen, tipli** dil. Yazım hataları çoğu zaman çalışmadan önce yakalanır.

| Laravel / PHP | C# / bu proje |
|---------------|----------------|
| `class User extends Authenticatable` | `class ApplicationUser : IdentityUser` |
| `$user->email` | `user.Email` (property, büyük harf) |
| `public function login()` | `public async Task<IActionResult> Login(…)` |
| `return response()->json($data)` | `return Ok(data)` / `Unauthorized("…")` |
| `User::where('email', $e)->first()` | `_userManager.FindByEmailAsync(e)` veya `_context.Orders.Where(…)` |
| `request()->validate([...])` | `[FromBody] LoginRequest request` (DTO sınıf) |
| `Route::post('/login', …)` | `[HttpPost("login")]` attribute, class’ta `[Route("api/[controller]")]` |
| `middleware('auth:sanctum')` | `[Authorize]` veya `[Authorize(Policy = "AdminOnly")]` |
| `config('app.url')` | `_configuration["App:FrontendBaseUrl"]` |
| `dispatch(new Job)` | `_publishEndpoint.Publish(new SomeEvent { … })` |
| `??` / `?:` | `??` aynı; ternary `? :` aynı |
| `$users = []` | `var list = new List<string>();` |
| `foreach ($roles as $r)` | `foreach (var r in roles)` |
| `use App\Models\User;` | `using Identity.API.Models;` |
| namespace otomatik PSR-4 | `namespace Identity.API.Controllers;` dosya yoluyla uyumlu olmalı |
| `async` yok (genelde) | `async Task` + `await` — I/O’da thread’i bloklama |
| `null` | `null`; `string?` = “null olabilir” (Nullable enable) |

Küçük örnek, yan yana:

```php
// Laravel
public function login(Request $request) {
    $user = User::where('email', $request->email)->first();
    if (!$user) return response()->json(['message' => 'yok'], 401);
    return response()->json(['token' => $token]);
}
```

```csharp
// Identity AuthController
[HttpPost("login")]
public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
{
    var user = await _userManager.FindByEmailAsync(request.Email);
    if (user == null) return Unauthorized("Kullanıcı bulunamadı.");
    return Ok(new AuthResponse { Token = token, Email = user.Email, … });
}
```

`await` = “DB cevabını bekle, bu arada thread’i başkasına ver”. Laravel’de çoğu iş senkron durur; burada I/O `async`.

Attribute’lar (`[HttpPost]`, `[Authorize]`) ≈ Laravel’de class/method üstündeki middleware ve route tanımı.

---

### Klasörler (bir servisin içinde)

Identity örneği — `src/Services/Identity.API/`:

| Klasör / dosya | Laravel |
|----------------|---------|
| `Program.cs` | `index.php` + `Kernel` + provider register |
| `Controller/AuthController.cs` | `app/Http/Controllers/AuthController.php` |
| `Models/ApplicationUser.cs` | `app/Models/User.php` |
| `Data/AppIdentityDbContext.cs` | Eloquent + migration şeması (DbContext) |
| `Data/IdentitySeeder.cs` | `database/seeders/…` |
| `Migrations/` | `database/migrations/` |
| `appsettings.json` | `.env` varsayılanları + `config/` |
| `*.csproj` | `composer.json` |
| `Dockerfile` | Laravel’i container’a alma |

`dotnet new` / Visual Studio yoksa bile: `dotnet build`, `dotnet run`, `dotnet ef migrations add …` ≈ `composer` + `artisan`.

---

### Bu parçanın özeti

> `Program.cs` = Laravel Kernel + service provider + `index.php`.  
> Üst yarı: kutuya ne koyulacak (DB, JWT, kuyruk). Alt yarı: istek hangi sırayla süzülecek.  
> Secret’lar `appsettings.json`’da örnek durur; gerçek değer Docker / `.env` ile `__` anahtarlarıyla ezer.  
> Controller = class + attribute route; DI constructor’dan gelir; cevap `Ok` / `Unauthorized`.

**Sonraki parça:** Identity.API ≈ Laravel `User` + Sanctum/Passport + auth routes.

---

## Parça 4 — Identity.API (giriş / kullanıcı / rol)

### Laravel’de karşılığı
- `User` model + `users` tablosu
- `Auth::attempt()` / `Hash::check`
- Sanctum veya Passport → token
- `spatie/laravel-permission` veya Gate → roller
- `routes/auth.php` → login, register, forgot-password

Burada hepsi **ayrı bir serviste**: `src/Services/Identity.API`.  
Catalog “ürün”, Order “sipariş” bilir; **şifre ve JWT yalnızca Identity** üretir. Diğer servisler token’ı **doğrular** (aynı secret), kullanıcı tablosuna bakmaz.

### Ne işe yarar?
- Kayıt / giriş / şifre sıfırlama / e-posta doğrulama
- Google–Facebook / OTP (telefon)
- JWT üretmek (`Authorization: Bearer …`)
- Roller: Admin, Editor, Support, Warehouse, Customer (+ JWT’de Guest)
- Adresler, profil, bildirim tercihleri
- Admin: kullanıcı listesi, rol atama, hesap kilitleme

Gateway yolu:

```
POST /auth/login      → Identity /api/auth/login
POST /auth/register   → /api/auth/register
GET  /auth/users      → admin (Aggregator da kullanır)
```

`appsettings.json` → `auth-route`: dışarı `/auth/*`, içeri `/api/auth/*`.

### Kullanıcı modeli
`ApplicationUser : IdentityUser` ≈ `User extends Authenticatable`.  
Hazır gelenler: Email, UserName, PasswordHash, Lockout…  
Eklenenler: FirstName, LastName, CreatedAt, soft delete, Addresses.

`AppIdentityDbContext : IdentityDbContext<ApplicationUser>` ≈ users + roles + pivot tabloları hazır; sen adres / OTP ekliyorsun.

Şifre: `UserManager.CreateAsync(user, password)` hash’ler. Laravel `Hash::make` gibi — düz metin tutulmaz.

### Login akışı (Sanctum yerine JWT)

```
1. FindByEmailAsync          ≈ User::where email
2. CheckPasswordSignInAsync  ≈ Auth::attempt (lockout dahil)
3. GetRolesAsync             ≈ $user->roles
4. GenerateJwtToken          claim: sub=userId, email, role[]
5. Ok({ token, roles })      cookie yok; client saklar
```

Token imzası `JwtSettings:Secret`. Gateway, Catalog, Order **aynı secret** ile doğrular — Identity’ye her istekte sormazlar. Secret değişirse bütün token’lar ölür.

Süre: `DurationInMinutes` (varsayılan 1440 = 1 gün), `RememberMe` ise gün cinsinden.

`[Authorize(Policy = "AdminOnly")]` ≈ `middleware('role:admin')`.  
Policy’ler `Program.cs`’te tanımlı (`RequireRole("Admin")` vs.).

### Roller (seed)
Açılışta `IdentitySeeder`: roller yoksa oluşturur; `DefaultAdmin:Email` yoksa admin yaratır.

| Rol | Kim |
|-----|-----|
| Admin | tam yetki |
| Editor / Support / Warehouse | panel personeli (kısmi) |
| Customer | vitrin müşterisi (kayıt olunca) |
| Guest | tabloda satır yok; sadece JWT claim |

Production’da `DefaultAdmin:Password` env’den gelmeli; yoksa admin seed atlanır.

### Laravel’den farklar
- Session cookie yok → SPA token taşır
- `auth()->user()` diğer serviste yok; token’daki `sub` + roller var
- Kullanıcı silme soft delete (`IsDeleted`); login reddedilir
- Production: e-posta doğrulanmadan JWT yok (`RequireConfirmedEmail`)
- Başarısız giriş → lockout (Identity options)

### Bu parçanın özeti

> Identity = Laravel Auth paketi + User + roller, tek başına bir API.  
> Kapıdan token çıkar; diğer servisler User tablosuna girmez, imzaya bakar.  
> Admin seed ve JWT secret config/env’de; Gateway `/auth`’u buraya yollar.

**Sonraki parça:** Catalog.API ≈ ürün / Eloquent / admin CRUD.

---

## Parça 5 — (sonra)
## Parça 6 — (sonra)
## Parça 7 — (sonra)
