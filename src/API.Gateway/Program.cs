using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Prometheus;
using Serilog;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using System.Collections.Concurrent;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration);
});

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

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var secretKey = builder.Configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(secretKey))
{
    if (builder.Environment.IsProduction())
        throw new InvalidOperationException(
            "Jwt:SecretKey (veya Jwt__SecretKey) Production ortamında zorunludur.");

    secretKey = "bu_benim_cok_gizli_sifrem_ecommerce_project_secret_key_12345";
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? builder.Configuration["JwtSettings:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? builder.Configuration["JwtSettings:Audience"];
var validateIssuerAudience = !string.IsNullOrWhiteSpace(jwtIssuer) && !string.IsNullOrWhiteSpace(jwtAudience);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateIssuer = validateIssuerAudience,
            ValidIssuer = jwtIssuer,
            ValidateAudience = validateIssuerAudience,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Panel personeli: Admin + Editor + Support + Warehouse
    options.AddPolicy("AdminOnly", policy => policy
        .RequireAuthenticatedUser()
        .RequireRole("Admin", "Editor", "Support", "Warehouse"));
});

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("fixed", limiterOptions =>
    {
        limiterOptions.PermitLimit = 100;
        limiterOptions.Window = TimeSpan.FromSeconds(10);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 5;
    });

    options.AddFixedWindowLimiter("auth", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 0;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        if (builder.Environment.IsDevelopment() && allowedOrigins.Length == 0)
        {
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
            return;
        }

        var origins = allowedOrigins.Length > 0
            ? allowedOrigins
            : new[] { "http://localhost:3000", "http://localhost:3002", "https://e-commerce.local" };

        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseCors("CorsPolicy");
app.UseHttpMetrics();

// Auth endpoint'leri için sıkı rate limit (login/register brute-force)
var authHits = new ConcurrentDictionary<string, (int Count, DateTime WindowStart)>();
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    if (path.Contains("/auth/login", StringComparison.OrdinalIgnoreCase)
        || path.Contains("/auth/register", StringComparison.OrdinalIgnoreCase)
        || path.Contains("/auth/forgot-password", StringComparison.OrdinalIgnoreCase))
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var key = $"{ip}:{path.ToLowerInvariant()}";
        var now = DateTime.UtcNow;
        var entry = authHits.AddOrUpdate(
            key,
            _ => (1, now),
            (_, prev) =>
            {
                if ((now - prev.WindowStart).TotalMinutes >= 1) return (1, now);
                return (prev.Count + 1, prev.WindowStart);
            });

        if (entry.Count > 10)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            await context.Response.WriteAsync("Çok fazla deneme. Lütfen bir dakika sonra tekrar deneyin.");
            return;
        }
    }

    await next();
});

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "Healthy", service = "API.Gateway" }));
app.MapMetrics();
app.MapReverseProxy().RequireRateLimiting("fixed");

app.Run();
