using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Microsoft.IdentityModel.Tokens; // JWT için gerekli
using System.Text; // Encoding için gerekli
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) =>
{
    config.ReadFrom.Configuration(context.Configuration); 
});

// --- 1. CORS AYARLARI (YENİ EKLENDİ) ---
// Tarayıcının (localhost:3000) Gateway'e erişmesine izin veriyoruz.
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.AllowAnyOrigin()   // Frontend (localhost:3000) dahil herkes gelebilir
              .AllowAnyMethod()   // GET, POST, PUT, DELETE
              .AllowAnyHeader();  // Token vs. her türlü başlık
    });
});

// --- 2. JWT AYARLARI (MEVCUT KODUN) ---
var secretKey = "bu_benim_cok_gizli_sifrem_ecommerce_project_secret_key_12345"; 

builder.Services.AddAuthentication()
    .AddJwtBearer("Bearer", options =>
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

// --- 3. OCELOT AYARLARI ---
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
builder.Services.AddOcelot(builder.Configuration);

var app = builder.Build();

// --- 4. MIDDLEWARE SIRALAMASI (ÇOK KRİTİK!) ---

// 1. Önce CORS: Kapıyı çalana "Girebilirsin" de (Yoksa tarayıcı Auth'a takılır)
app.UseCors("CorsPolicy");

// 2. Sonra Kimlik Kontrolü
app.UseAuthentication(); 

// 3. Sonra Yetki Kontrolü
app.UseAuthorization();  

// 4. En son Yönlendirme
await app.UseOcelot(); 

app.Run();