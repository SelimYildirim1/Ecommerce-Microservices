using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Microsoft.IdentityModel.Tokens; // JWT için gerekli
using System.Text; // Encoding için gerekli
using Serilog;
using Microsoft.AspNetCore.Authorization;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration); 
});

// --- 1. CORS AYARLARI (YENİ EKLENDİ) ---
// Tarayıcının (localhost:3000) Gateway'e erişmesine izin veriyoruz.
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.AllowAnyOrigin()   // Frontend (localhost:3000) dahil herkes gelebilir
              .AllowAnyMethod()   // GET, POST, PUT, DELETE
              .AllowAnyHeader();  // Token vs. her türlü başlık
    });
});

// --- 2. JWT AYARLARI (MEVCUT KODUN) ---
var secretKey = "bu_benim_cok_gizli_sifrem_ecommerce_project_secret_key_12345"; 

builder.Services.AddAuthentication()
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateIssuer = false, 
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

// --- 3. HEALTHCHECKS UI ---
builder.Services
    .AddHealthChecksUI()
    .AddInMemoryStorage();

// --- 4. OCELOT AYARLARI ---
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
builder.Services.AddOcelot(builder.Configuration);

var app = builder.Build();

// --- 5. MIDDLEWARE SIRALAMASI (ÇOK KRİTİK!) ---
//
// -1. HealthChecks UI middleware (gömülü statik dosyalar için)
app.UseHealthChecksUI();
//
// 0. Endpoint tabanlı routing middleware
app.UseRouting();
//
// 0.5 Prometheus HTTP metrikleri (routing'den sonra, auth'dan önce)
app.UseHttpMetrics();
//
// 1. CORS: Tarayıcıdan gelen isteklere izin ver
app.UseCors("CorsPolicy");
//
// 2. Kimlik Doğrulama
app.UseAuthentication(); 
//
// 3. Yetkilendirme
app.UseAuthorization();
//
// 4. HealthChecks UI endpoint'lerini Ocelot'tan ÖNCE map et
app.UseEndpoints(endpoints =>
{
    endpoints.MapHealthChecksUI(c =>
    {
        c.UIPath = "/health-ui";
        c.ApiPath = "/health-api";
    }).AllowAnonymous();
    endpoints.MapMetrics(); // /metrics endpoint'i
});
//
// 5. En son Ocelot gateway
await app.UseOcelot(); 

app.Run();