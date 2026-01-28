using MassTransit;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
    // A) Consumer'ları (Dinleyicileri) Tanıt
    config.AddConsumer<BasketCheckoutConsumer>();
    config.AddConsumer<PaymentSucceededConsumer>();

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

        // C) Kuyruk Ayarları
        // PaymentSucceededEvent için özel endpoint
        _config.ReceiveEndpoint("order-payment-succeeded-queue", e =>
        {
            e.ConfigureConsumer<PaymentSucceededConsumer>(context);
        });
        
        // Diğer consumer'lar için otomatik endpoint
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