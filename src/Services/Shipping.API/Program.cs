using Microsoft.EntityFrameworkCore;
using Serilog;
using Shipping.API.Data;
using Shipping.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, config) => config.ReadFrom.Configuration(context.Configuration));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Enum'lar isim olarak serilestirilir; istemciler sayisal deger ezberlemez
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<ShippingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddSingleton<ICarrierAdapter, ArasAdapter>();
builder.Services.AddSingleton<ICarrierAdapter, YurticiAdapter>();
builder.Services.AddSingleton<ICarrierAdapter, MngAdapter>();
builder.Services.AddSingleton<ICarrierAdapter, PttAdapter>();
builder.Services.AddSingleton<CarrierAdapterFactory>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var context = scope.ServiceProvider.GetRequiredService<ShippingDbContext>();

    const int maxRetries = 10;
    var delay = TimeSpan.FromSeconds(3);

    for (var attempt = 1; attempt <= maxRetries; attempt++)
    {
        try
        {
            context.Database.EnsureCreated();
            await ShippingSeeder.SeedAsync(context, logger);
            logger.LogInformation("Shipping veritabanı hazır.");
            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Veritabanı denemesi {Attempt}/{Max} başarısız.", attempt, maxRetries);
            if (attempt == maxRetries) throw;
            Thread.Sleep(delay);
        }
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CorsPolicy");
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));

app.Run();
