using Catalog.API.Data;
using Catalog.API.Consumers;
using Microsoft.EntityFrameworkCore;
using Core.Shared.Behaviors;
using FluentValidation;
using MassTransit;
using Microsoft.Extensions.Logging;
using Serilog;
using RabbitMQ.Client;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

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

// --- SERVİSLERİN EKLENDİĞİ BÖLÜM (DI Container) ---

// 1. Controller desteğini ekle
builder.Services.AddControllers();

// 2. Swagger desteğini ekle (API dokümantasyonu)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

    config.UsingRabbitMq((ctx, _config) =>
    {
        var rabbitMqHost = builder.Configuration["RabbitMQ:HostName"] ?? "rabbitmq";
        _config.Host(rabbitMqHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        // 👇 GLOBAL MESAJ TEKRAR (RETRY) POLİTİKASI
        _config.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));
        
        // Stok düşürme için OrderCreatedEvent'i dinliyoruz
        _config.ReceiveEndpoint("catalog-stock-update-queue", e =>
        {
            e.ConfigureConsumer<OrderCreatedConsumer>(ctx);
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

app.UseAuthorization();

app.MapControllers();

// Health Check Endpoint
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
}).AllowAnonymous();

app.Run();