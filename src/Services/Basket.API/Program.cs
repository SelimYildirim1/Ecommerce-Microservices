using Basket.API.Repositories;
using Basket.API.Services;
using MassTransit;
using Microsoft.Extensions.DependencyInjection;
using Swashbuckle.AspNetCore;


var builder = WebApplication.CreateBuilder(args);

// --- 1. Servis Kayıtları (DI Container) ---

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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
    });
});

var app = builder.Build();

// --- 2. Middleware (Uygulama Hattı) ---

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();
app.MapControllers();

app.Run();