
using MassTransit;
using Notification.API.Consumers;
using Serilog;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration); 
});

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi


// MassTransit Setup
builder.Services.AddMassTransit(config =>
{
    config.AddConsumer<PaymentSucceededConsumer>();
    config.AddConsumer<PaymentFailedConsumer>();

    config.UsingRabbitMq((context, _config) =>
    {
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

        _config.ReceiveEndpoint("notification-payment-succeeded-queue", e =>
        {
            e.ConfigureConsumer<PaymentSucceededConsumer>(context);
        });

        _config.ReceiveEndpoint("notification-payment-failed-queue", e =>
        {
            e.ConfigureConsumer<PaymentFailedConsumer>(context);
        });
    });
});

var app = builder.Build();

app.UseHttpMetrics(); // Prometheus HTTP metrikleri
app.MapMetrics();     // /metrics endpoint'i

app.Run();
