using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Prometheus;
using Serilog;
using System.Text;
using System.Threading.RateLimiting;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// -------------------------------------------------------
// 1. LOGGING (Serilog)
// -------------------------------------------------------
builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration);
});

// -------------------------------------------------------
// 1.5 DISTRIBUTED TRACING (OpenTelemetry → Jaeger)
// -------------------------------------------------------
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("API.Gateway"))
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

// -------------------------------------------------------
// 2. YARP - Reverse Proxy
//    Konfigürasyon yarp.json'dan okunur (appsettings içinde)
// -------------------------------------------------------
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// -------------------------------------------------------
// 3. JWT Authentication
// -------------------------------------------------------
var secretKey = builder.Configuration["Jwt:SecretKey"]
    ?? "bu_benim_cok_gizli_sifrem_ecommerce_project_secret_key_12345";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// -------------------------------------------------------
// 4. RATE LIMITING (ASP.NET Core 7+ built-in)
//    - "fixed" policy: 100 istek / 10 saniye / IP başına
// -------------------------------------------------------
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("fixed", limiterOptions =>
    {
        limiterOptions.PermitLimit = 100;
        limiterOptions.Window = TimeSpan.FromSeconds(10);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 5;
    });

    // Limit aşıldığında 429 Too Many Requests döner
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// -------------------------------------------------------
// 5. CORS
// -------------------------------------------------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// -------------------------------------------------------
// MIDDLEWARE PIPELINE
// -------------------------------------------------------
app.UseSerilogRequestLogging();

app.UseCors("CorsPolicy");

app.UseHttpMetrics(); // Prometheus metrikleri

app.UseRateLimiter(); // Rate limiting

app.UseAuthentication();
app.UseAuthorization();

// Prometheus /metrics endpoint'i
app.MapMetrics();

// YARP proxy - tüm route'ları yönetir
// Rate limiting policy tüm proxy route'larına uygulanır
app.MapReverseProxy().RequireRateLimiting("fixed");

app.Run();
