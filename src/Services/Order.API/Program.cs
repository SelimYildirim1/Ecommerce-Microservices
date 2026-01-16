using MassTransit;
using Microsoft.EntityFrameworkCore;
using Order.API.Consumers; // Consumer'ın olduğu yer
using Order.API.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Controller ve Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. Veritabanı (Postgres - OrderDB)
builder.Services.AddDbContext<OrderDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 3. MediatR (CQRS için)
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

// 4. MassTransit (RabbitMQ) - TEK VE DOĞRU OLAN BLOK
builder.Services.AddMassTransit(config =>
{
    // A) Consumer'ı (Dinleyiciyi) Tanıt
    config.AddConsumer<BasketCheckoutConsumer>();

    // B) RabbitMQ Bağlantısı
    config.UsingRabbitMq((context, _config) =>
    {
        _config.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        // C) Kuyruk Ayarları (Otomatik endpoint yapılandırması)
        // Bu satır olmazsa Consumer çalışmaz!
        _config.ConfigureEndpoints(context);
    });
});

var app = builder.Build();

// Veritabanı Migration (Otomatik Tablo Oluşturma)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<OrderDbContext>();
        context.Database.Migrate(); // Veritabanı yoksa oluşturur
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Veritabanı oluşturulurken hata çıktı.");
    }
}

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();
app.MapControllers();

app.Run();