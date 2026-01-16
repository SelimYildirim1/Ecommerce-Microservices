using Catalog.API.Data;
using Microsoft.EntityFrameworkCore;
using Core.Shared.Behaviors; // Bunu eklemeyi unutma
using FluentValidation;      // Bunu eklemeyi unutma
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

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
    // RabbitMQ Kullanacağımızı Söylüyoruz
    config.UsingRabbitMq((context, _config) =>
    {
        // Docker'daki RabbitMQ adresimiz
        // Eğer Docker'da kullanıcı adı şifre değiştirdiysen burayı güncelle
        _config.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });
    });
});

// --- SERVİSLER BİTTİ, UYGULAMA İNŞA EDİLİYOR ---
var app = builder.Build();

// --- MİDDLEWARE (ARA KATMAN) AYARLARI ---

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();

app.MapControllers();

app.Run();