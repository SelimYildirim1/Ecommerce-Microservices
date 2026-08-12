using Catalog.API.Data;
using Catalog.API.Consumers;
using Microsoft.EntityFrameworkCore;
using Core.Shared.Behaviors;
using FluentValidation;
using MassTransit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using RabbitMQ.Client;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Prometheus;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// HealthChecks.Rabbitmq v9+ → IConnection DI üzerinden sağlanmalı
builder.Services.AddSingleton<IConnection>(sp =>
{
    var factory = new ConnectionFactory();

    var rabbitHost = builder.Configuration["RabbitMQ:HostName"];
    if (!string.IsNullOrEmpty(rabbitHost))
    {
        factory.HostName = rabbitHost;
    }
    else
    {
        factory.HostName = "localhost";
    }
    factory.UserName = "guest";
    factory.Password = "guest";

    return factory.CreateConnection();
});

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!)
    .AddRabbitMQ(name: "rabbitmq");

builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration); 
});

// -------------------------------------------------------
// DISTRIBUTED TRACING (OpenTelemetry → Jaeger)
// -------------------------------------------------------
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("Catalog.API"))
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddEntityFrameworkCoreInstrumentation()
            .AddOtlpExporter(options =>
            {
                options.Endpoint = new Uri(
                    builder.Configuration["OpenTelemetry:Endpoint"] ?? "http://localhost:4317");
            });
    });

// --- SERVİSLERİN EKLENDİĞİ BÖLÜM (DI Container) ---

// 1. Controller desteğini ekle
// Enum'lar panelde okunabilir olsun diye string olarak serialize edilir
builder.Services.AddScoped<Catalog.API.Filters.AuditActionFilter>();
builder.Services.AddControllers(options =>
    {
        options.Filters.AddService<Catalog.API.Filters.AuditActionFilter>();
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Stok hareketlerini tek noktadan yazan yardimci
builder.Services.AddScoped<Catalog.API.Services.StockLedger>();

// 2. Swagger desteğini ekle (API dokümantasyonu)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// JWT — Identity ile aynı secret (env: JwtSettings__Secret veya Jwt__SecretKey)
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
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin"));
    options.AddPolicy("EditorOrAdmin", policy =>
        policy.RequireRole("Admin", "Editor"));
    options.AddPolicy("SupportOrAdmin", policy =>
        policy.RequireRole("Admin", "Support"));
    options.AddPolicy("WarehouseOrAdmin", policy =>
        policy.RequireRole("Admin", "Warehouse"));
    options.AddPolicy("Staff", policy =>
        policy.RequireRole("Admin", "Editor", "Support", "Warehouse"));
});
builder.Services.AddHttpClient();

// 3. Veritabanı Servisini (PostgreSQL) ekle
builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 4. MediatR Servisini Ekle (HATAYI ÇÖZEN SATIR BURASI)
// Bu satır, projedeki tüm Command/Query handler'larını bulup kutuya koyar.
// MediatR ve Pipeline Behavior Kaydı
builder.Services.AddMediatR(cfg => 
{
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly);
    
    // YENİ: Pipeline Behavior'ı ekliyoruz
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
});

// YENİ: Validatorları otomatik bul ve kaydet
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);


builder.Services.AddMassTransit(config =>
{
    config.AddConsumer<OrderCreatedConsumer>();
    config.AddConsumer<PaymentFailedConsumer>();
    config.AddConsumer<OrderStockReleaseConsumer>();

    config.UsingRabbitMq((ctx, _config) =>
    {
        var rabbitMqHost = builder.Configuration["RabbitMQ:HostName"] ?? "rabbitmq";
        _config.Host(rabbitMqHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        // GLOBAL MESAJ TEKRAR (RETRY) POLİTİKASI
        _config.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        
        // Stok düşürme için OrderCreatedEvent'i dinliyoruz
        _config.ReceiveEndpoint("catalog-stock-update-queue", e =>
        {
            e.ConfigureConsumer<OrderCreatedConsumer>(ctx);
        });

        // Ödeme başarısız olursa stok geri ekleme
        _config.ReceiveEndpoint("catalog-payment-failed-queue", e =>
        {
            e.ConfigureConsumer<PaymentFailedConsumer>(ctx);
        });

        // İptal / iade stok iadesi
        _config.ReceiveEndpoint("catalog-order-stock-release-queue", e =>
        {
            e.ConfigureConsumer<OrderStockReleaseConsumer>(ctx);
        });
    });
});

// --- SERVİSLER BİTTİ, UYGULAMA İNŞA EDİLİYOR ---
var app = builder.Build();

// --- VERİTABANI MİGRATİON'LARINI OTOMATİK ÇALIŞTIR ---
// PostgreSQL hazır olana kadar dene; Migrate() tabloları oluşturur, varsa dokunmaz (veriler korunur).
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var context = services.GetRequiredService<CatalogDbContext>();
    const int maxRetries = 10;
    var delay = TimeSpan.FromSeconds(3);

    for (int i = 1; i <= maxRetries; i++)
    {
        try
        {
            context.Database.Migrate();
            logger.LogInformation("Veritabanı migration tamamlandı.");

            // Tek seferlik: Products tablosu boşsa 50 örnek ürün ekle. Doluysa dokunma.
            CatalogDbSeeder.SeedAsync(context, logger, force: false).GetAwaiter().GetResult();

            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Migration denemesi {Attempt}/{Max} başarısız. {Delay}s sonra tekrar denenecek.", i, maxRetries, delay.TotalSeconds);
            if (i == maxRetries)
            {
                logger.LogError(ex, "Migration {Max} denemeden sonra başarısız. Uygulama başlamayacak.", maxRetries);
                throw;
            }
            Thread.Sleep(delay);
        }
    }
}

// --- MİDDLEWARE (ARA KATMAN) AYARLARI ---

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Yuklenen urun gorselleri /uploads/... adresinden servis edilir
var webRootPath = app.Environment.WebRootPath
    ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(Path.Combine(webRootPath, "uploads"));
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health Check Endpoint
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
}).AllowAnonymous();

app.UseHttpMetrics(); // Prometheus HTTP metrikleri
app.MapMetrics();     // /metrics endpoint'i

app.Run();