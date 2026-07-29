using Basket.API.Repositories;
using Basket.API.Services;
using MassTransit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Swashbuckle.AspNetCore;
using Serilog;
using Prometheus;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using System.Security.Claims;
using System.Text;


var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration); 
});

// -------------------------------------------------------
// DISTRIBUTED TRACING (OpenTelemetry → Jaeger)
// -------------------------------------------------------
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("Basket.API"))
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter(options =>
            {
                options.Endpoint = new Uri(
                    builder.Configuration["OpenTelemetry:Endpoint"] ?? "http://localhost:4317");
            });
    });

// --- 1. Servis Kayıtları (DI Container) ---

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var jwtSecret = builder.Configuration["JwtSettings:Secret"]
    ?? builder.Configuration["Jwt:SecretKey"]
    ?? "bu_benim_cok_gizli_sifrem_ecommerce_project_secret_key_12345";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization();

// A) Redis Cache Entegrasyonu
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis");
});

// B) Repository Entegrasyonu
builder.Services.AddScoped<IBasketRepository, BasketRepository>();

// --- CATALOG API İLE İLETİŞİM ---

// Docker: Services__CatalogApi=http://catalog-api:8080 (env'den gelir)
// Local:  appsettings.Development veya appsettings'te Services:CatalogApi
var catalogBaseUrl = builder.Configuration["Services:CatalogApi"]
    ?? builder.Configuration["GrpcSettings:CatalogUrl"]
    ?? "http://localhost:5000";

builder.Services.AddHttpClient<CatalogService>(client =>
{
    client.BaseAddress = new Uri(catalogBaseUrl);
});

// --- PROMOSYON VE KARGO SERVISLERI ---
// Bu servisler kapaliysa checkout akisi bozulmaz; indirim/kargo 0 kabul edilir.
var promotionBaseUrl = builder.Configuration["Services:PromotionApi"]
    ?? "http://localhost:5070";

builder.Services.AddHttpClient<PromotionService>(client =>
{
    client.BaseAddress = new Uri(promotionBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(5);
});

var shippingBaseUrl = builder.Configuration["Services:ShippingApi"]
    ?? "http://localhost:5071";

builder.Services.AddHttpClient<ShippingService>(client =>
{
    client.BaseAddress = new Uri(shippingBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(5);
});

// C) MassTransit (RabbitMQ) Entegrasyonu
// (Şimdilik sadece ayar yapıyoruz, ileride "Sipariş Oluştu" mesajı atacağız)
builder.Services.AddMassTransit(config =>
{
    config.UsingRabbitMq((context, _config) =>
    {
        // Configuration'dan RabbitMQ hostname'ini oku
        // Docker: RabbitMQ__HostName=rabbitmq (environment variable)
        // Local: appsettings.json'dan EventBusSettings:HostAddress veya varsayılan localhost
        var rabbitMqHost = builder.Configuration["RabbitMQ:HostName"] 
            ?? builder.Configuration["EventBusSettings:HostAddress"]?.Replace("amqp://guest:guest@", "").Split(':')[0]
            ?? "localhost";

        _config.Host(rabbitMqHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        // 👇 GLOBAL MESAJ TEKRAR (RETRY) POLİTİKASI
        _config.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
    });
});

var app = builder.Build();

// --- 2. Middleware (Uygulama Hattı) ---

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpMetrics(); // Prometheus HTTP metrikleri
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", service = "Basket.API" }));
app.MapMetrics(); // /metrics endpoint'i

app.Run();