using Basket.API.Repositories;
using MassTransit;

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

// C) MassTransit (RabbitMQ) Entegrasyonu
// (Şimdilik sadece ayar yapıyoruz, ileride "Sipariş Oluştu" mesajı atacağız)
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