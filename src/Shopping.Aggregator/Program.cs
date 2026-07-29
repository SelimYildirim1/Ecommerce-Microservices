using Serilog;
using Shopping.Aggregator.Services;
using Prometheus;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// --- LOGGING ---
builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration);
});

// -------------------------------------------------------
// DISTRIBUTED TRACING (OpenTelemetry → Jaeger)
// -------------------------------------------------------
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("Shopping.Aggregator"))
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

// --- CONTROLLERS ---
builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();

// --- CORS ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// --- HTTP CLIENTS ---
// Her servis için ayrı typed HttpClient tanımlıyoruz.
// BaseAddress appsettings'ten okunur.
builder.Services.AddHttpClient<IOrderService, OrderService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:OrderApi"]!);
});

builder.Services.AddHttpClient<ICatalogService, CatalogService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:CatalogApi"]!);
});

builder.Services.AddHttpClient<IIdentityService, IdentityService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Services:IdentityApi"]!);
});

var app = builder.Build();

app.UseCors("CorsPolicy");
app.UseHttpMetrics();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", service = "Shopping.Aggregator" }));
app.MapMetrics(); // /metrics → Prometheus

app.Run();
