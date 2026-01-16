using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// 1. Ayar dosyasını (ocelot.json) yükle
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

// 2. Ocelot Servisini Ekle
builder.Services.AddOcelot(builder.Configuration);

var app = builder.Build();

// 3. Ocelot Middleware'ini Kullan
await app.UseOcelot();

app.Run();