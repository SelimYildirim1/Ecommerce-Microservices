using Identity.API.Data;
using Identity.API.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using Serilog;
using Prometheus;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration); 
});

// -------------------------------------------------------
// DISTRIBUTED TRACING (OpenTelemetry → Jaeger)
// -------------------------------------------------------
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService("Identity.API"))
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddEntityFrameworkCoreInstrumentation()
            .AddOtlpExporter(options =>
            {
                options.Endpoint = new Uri(
                    builder.Configuration["OpenTelemetry:Endpoint"] ?? "http://localhost:4317");
            });
    });

// 1. Controller ve Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. Veritabanı (Postgres)
builder.Services.AddDbContext<AppIdentityDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 3. Identity (Kullanıcı Yönetimi) Ayarları
var isProduction = builder.Environment.IsProduction();
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    if (isProduction)
    {
        options.Password.RequireDigit = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;
        options.SignIn.RequireConfirmedEmail = true;
    }
    else
    {
        // Geliştirme ortamı için basitleştirilmiş kurallar
        options.Password.RequireDigit = false;
        options.Password.RequiredLength = 4;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireLowercase = false;
        options.SignIn.RequireConfirmedEmail = false;
    }
})
.AddEntityFrameworkStores<AppIdentityDbContext>()
.AddDefaultTokenProviders();

// 4. JWT Authentication Ayarları
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings.GetValue<string>("Secret");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!)),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings.GetValue<string>("Issuer"),
        ValidateAudience = true,
        ValidAudience = jwtSettings.GetValue<string>("Audience"),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = ClaimTypes.Role
    };
});

builder.Services.AddAuthorization();

builder.Services.AddMassTransit(config =>
{
    config.UsingRabbitMq((_, cfg) =>
    {
        var rabbitMqHost = builder.Configuration["RabbitMQ:HostName"]
            ?? builder.Configuration["EventBusSettings:HostAddress"]?.Replace("amqp://guest:guest@", "").Split(':')[0]
            ?? "localhost";

        cfg.Host(rabbitMqHost, "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });
    });
});

var app = builder.Build();

// Otomatik Migration (Veritabanını oluştur) + rol/admin seed
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppIdentityDbContext>();
    context.Database.Migrate();

    var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
    var logger = services.GetRequiredService<ILogger<Program>>();

    await IdentitySeeder.SeedAsync(roleManager, userManager, builder.Configuration, logger);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Authentication (Kimlik Doğrulama) Middleware'i - Authorization'dan ÖNCE olmalı
app.UseAuthentication(); 
app.UseAuthorization();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", service = "Identity.API" }));
app.UseHttpMetrics(); // Prometheus HTTP metrikleri
app.MapMetrics();     // /metrics endpoint'i

app.Run();