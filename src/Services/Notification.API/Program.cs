using MassTransit;
using Microsoft.EntityFrameworkCore;
using Notification.API.Consumers;
using Notification.API.Data;
using Notification.API.Services;
using Serilog;
using Prometheus;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration);
});

builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("Notification.API"))
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter(options =>
            {
                options.Endpoint = new Uri(
                    builder.Configuration["OpenTelemetry:Endpoint"] ?? "http://localhost:4317");
            });
    });

builder.Services.AddControllers();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost;Port=5432;Database=NotificationDb;User Id=postgres;Password=postgres;";

builder.Services.AddDbContext<NotificationDbContext>(options =>
    options.UseNpgsql(connectionString));

var smtpOptions = builder.Configuration
    .GetSection(SmtpOptions.SectionName)
    .Get<SmtpOptions>() ?? new SmtpOptions();

builder.Services.AddSingleton(smtpOptions);
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IEmailTemplateService, EmailTemplateService>();

builder.Services.AddMassTransit(config =>
{
    config.AddConsumer<PaymentSucceededConsumer>();
    config.AddConsumer<PaymentFailedConsumer>();
    config.AddConsumer<AccountEmailConsumer>();
    config.AddConsumer<OrderShippedConsumer>();

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

        _config.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));

        _config.ReceiveEndpoint("notification-payment-succeeded-queue", e =>
        {
            e.ConfigureConsumer<PaymentSucceededConsumer>(context);
        });

        _config.ReceiveEndpoint("notification-payment-failed-queue", e =>
        {
            e.ConfigureConsumer<PaymentFailedConsumer>(context);
        });

        _config.ReceiveEndpoint("notification-account-email-queue", e =>
        {
            e.ConfigureConsumer<AccountEmailConsumer>(context);
        });

        _config.ReceiveEndpoint("notification-order-shipped-queue", e =>
        {
            e.ConfigureConsumer<OrderShippedConsumer>(context);
        });
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
    await NotificationDbSeeder.SeedAsync(db);
}

app.MapGet("/health", () => Results.Ok(new { status = "Healthy", service = "Notification.API" }));

app.MapControllers();

app.UseHttpMetrics();
app.MapMetrics();

app.Run();
