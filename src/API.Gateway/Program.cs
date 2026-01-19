using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Microsoft.IdentityModel.Tokens; // BU GEREKLİ
using System.Text; // BU GEREKLİ

var builder = WebApplication.CreateBuilder(args);

// --- 1. JWT AYARLARI (GÜVENLİK GÖREVLİSİ) ---
// Identity API'deki "Secret" anahtarının AYNISI olmak zorunda!
var secretKey = "bu_benim_cok_gizli_sifrem_ecommerce_project_secret_key_12345"; 

builder.Services.AddAuthentication()
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ValidateIssuer = false, // Şimdilik false (kolaylık olsun diye)
            ValidateAudience = false, // Şimdilik false
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

// --- OCELOT AYARLARI ---
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);
builder.Services.AddOcelot(builder.Configuration);

var app = builder.Build();

// --- SIRALAMA ÖNEMLİ ---
app.UseAuthentication(); // Önce kimlik sor
app.UseAuthorization();  // Sonra yetki ver

await app.UseOcelot(); // En son yönlendir

app.Run();