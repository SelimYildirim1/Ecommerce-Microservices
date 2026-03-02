using MassTransit;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Order.API.Consumers; // Consumer'ın olduğu yer
using Order.API.Data;
using Serilog;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using RabbitMQ.Client;
using Order.API.Hubs;
using Prometheus;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// HealthChecks.Rabbitmq v9+ → IConnection DI üzerinden sağlanmalı
builder.Services.AddSingleton<IConnection>(sp =>
{
    var factory = new ConnectionFactory();

    // Docker ortamında RabbitMQ__HostName env var (ör: "rabbitmq") kullanılır,
    // yoksa appsettings'teki AMQP URI, yoksa localhost'a bağlanır.
    var rabbitHost = builder.Configuration["RabbitMQ:HostName"];
    var hostAddress = builder.Configuration["EventBusSettings:HostAddress"];

    if (!string.IsNullOrEmpty(rabbitHost))
    {
        factory.HostName = rabbitHost;
        factory.UserName = "guest";
        factory.Password = "guest";
    }
    else if (!string.IsNullOrEmpty(hostAddress))
    {
        factory.Uri = new Uri(hostAddress);
    }
    else
    {
        factory.HostName = "localhost";
        factory.UserName = "guest";
        factory.Password = "guest";
    }

    return factory.CreateConnection();
});

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!)
    .AddRabbitMQ();

//  1. Serilog Ayarı (Logları Seq'e gönder)
builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration); 
});

// -------------------------------------------------------
// DISTRIBUTED TRACING (OpenTelemetry → Jaeger)
// -------------------------------------------------------
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("Order.API"))
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

// 1. Controller ve Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// SignalR (Gerçek zamanlı sipariş durumu için)
builder.Services.AddSignalR();

// CORS - Next.js (http://localhost:3000) üzerinden gelen SignalR bağlantılarını kabul et
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// 2. Veritabanı (Postgres - OrderDB)
builder.Services.AddDbContext<OrderDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"), configure =>
    {
        // 👇 İŞTE SİHİRLİ KOD BURASI:
        // Veritabanı hatası alırsan (bağlantı kopması vb.), 5 kereye kadar tekrar dene.
        configure.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null);
    });
});
// 3. MediatR (CQRS için)
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

// 4. MassTransit (RabbitMQ) - TEK VE DOĞRU OLAN BLOK
builder.Services.AddMassTransit(config =>
{
    // A) Consumer'ları (Dinleyicileri) Tanıt
    config.AddConsumer<BasketCheckoutConsumer>();
    config.AddConsumer<PaymentSucceededConsumer>();
    config.AddConsumer<PaymentFailedConsumer>();
    config.AddConsumer<StockNotReservedConsumer>();

    // B) RabbitMQ Bağlantısı
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
        // Herhangi bir mesaj işlenirken hata olursa:
        // 1) Hemen tekrar dene
        // 2) Olmazsa 5 sn bekle tekrar dene
        // 3) Olmazsa 5 sn daha bekle tekrar dene
        // 4) Hala başarısızsa hata kuyruğuna düşer (MassTransit'in kendi mekanizması)
        _config.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));

        // C) Kuyruk Ayarları
        // PaymentSucceededEvent için özel endpoint
        _config.ReceiveEndpoint("order-payment-succeeded-queue", e =>
        {
            e.ConfigureConsumer<PaymentSucceededConsumer>(context);
        });

        _config.ReceiveEndpoint("order-payment-failed-queue", e =>
        {
            e.ConfigureConsumer<PaymentFailedConsumer>(context);
        });

        _config.ReceiveEndpoint("order-stock-not-reserved-queue", e =>
        {
            e.ConfigureConsumer<StockNotReservedConsumer>(context);
        });
        
        // Diğer consumer'lar için otomatik endpoint
        _config.ConfigureEndpoints(context);
    });
});

var app = builder.Build();

// Veritabanı Migration - PostgreSQL hazır olana kadar tekrar dene (Catalog API ile aynı mantık)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var context = services.GetRequiredService<OrderDbContext>();
    const int maxRetries = 10;
    var delay = TimeSpan.FromSeconds(3);

    for (int i = 1; i <= maxRetries; i++)
    {
        try
        {
            context.Database.Migrate();
            logger.LogInformation("OrderDb veritabanı migration tamamlandı.");
            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "OrderDb migration denemesi {Attempt}/{Max} başarısız. {Delay}s sonra tekrar denenecek.", i, maxRetries, delay.TotalSeconds);
            if (i == maxRetries)
            {
                logger.LogError(ex, "OrderDb migration {Max} denemeden sonra başarısız. Uygulama başlamayacak.", maxRetries);
                throw;
            }
            Thread.Sleep(delay);
        }
    }
}

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS, auth'dan önce olmalı
app.UseCors("CorsPolicy");

app.UseAuthorization();
app.MapControllers();

// SignalR Hub endpoint'i
app.MapHub<OrderStatusHub>("/hubs/orderStatus");

// 👇 2. Endpoint'i Aç (App tarafı)
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
}).AllowAnonymous();

app.UseHttpMetrics(); // Prometheus HTTP metrikleri
app.MapMetrics();     // /metrics endpoint'i

app.Run();