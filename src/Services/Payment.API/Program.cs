using MassTransit;
using Payment.API.Consumers;
using Serilog;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration); 
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- MASSTRANSIT (RABBITMQ) AYARLARI ---
builder.Services.AddMassTransit(config =>
{
    // Consumer'ı (Tüketiciyi) tanıtıyoruz
    config.AddConsumer<StockReservedConsumer>();

    config.UsingRabbitMq((ctx, cfg) =>
    {
        // Configuration'dan RabbitMQ hostname'ini oku
        // Docker: RabbitMQ__HostName=rabbitmq (environment variable)
        // Local: appsettings.json'dan EventBusSettings:HostAddress veya varsayılan localhost
        var rabbitMqHost = builder.Configuration["RabbitMQ:HostName"] 
            ?? builder.Configuration["EventBusSettings:HostAddress"]?.Replace("amqp://guest:guest@", "").Split(':')[0]
            ?? "localhost";

        cfg.Host(rabbitMqHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        // 👇 GLOBAL MESAJ TEKRAR (RETRY) POLİTİKASI
        cfg.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));

        // Kuyruk Adı: "stock-reserved-queue"
        cfg.ReceiveEndpoint("stock-reserved-queue", c =>
        {
            c.ConfigureConsumer<StockReservedConsumer>(ctx);
        });
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpMetrics(); // Prometheus HTTP metrikleri
app.MapControllers();
app.MapMetrics();     // /metrics endpoint'i

app.Run();