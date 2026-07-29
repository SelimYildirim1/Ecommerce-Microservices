using Microsoft.EntityFrameworkCore;
using Shipping.API.Entities;

namespace Shipping.API.Data;

/// <summary>Bos veritabanina varsayilan kargo firmalari ve fiyat kurallari ekler.</summary>
public static class ShippingSeeder
{
    public static async Task SeedAsync(ShippingDbContext context, ILogger logger)
    {
        if (!await context.Settings.AnyAsync())
        {
            context.Settings.Add(new ShippingSettings
            {
                FreeShippingThreshold = 750m,
                DefaultPrice = 49.90m,
                DefaultDesiPerItem = 1
            });
        }

        if (await context.Carriers.AnyAsync())
        {
            await context.SaveChangesAsync();
            return;
        }

        var defaults = new[]
        {
            ("Aras Kargo", "aras", "https://kargotakip.araskargo.com.tr/?code={trackingNumber}", 2, 44.90m),
            ("Yurtiçi Kargo", "yurtici", "https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code={trackingNumber}", 2, 49.90m),
            ("MNG Kargo", "mng", "https://kargotakip.mngkargo.com.tr/?takipNo={trackingNumber}", 3, 39.90m),
            ("PTT Kargo", "ptt", "https://gonderitakip.ptt.gov.tr/Track/Verify?q={trackingNumber}", 4, 34.90m)
        };

        foreach (var (name, code, template, days, basePrice) in defaults)
        {
            var carrier = new Carrier
            {
                Name = name,
                Code = code,
                TrackingUrlTemplate = template,
                EstimatedDays = days,
                IsActive = true
            };

            // Desi araligina gore kademeli fiyat
            carrier.Rates.Add(new ShippingRate
            {
                CarrierId = carrier.Id,
                MinDesi = 0,
                MaxDesi = 5,
                Price = basePrice
            });
            carrier.Rates.Add(new ShippingRate
            {
                CarrierId = carrier.Id,
                MinDesi = 5.01m,
                MaxDesi = 15,
                Price = basePrice + 25m
            });
            carrier.Rates.Add(new ShippingRate
            {
                CarrierId = carrier.Id,
                MinDesi = 15.01m,
                MaxDesi = 999,
                Price = basePrice + 65m
            });

            context.Carriers.Add(carrier);
        }

        await context.SaveChangesAsync();
        logger.LogInformation("Varsayılan kargo firmaları eklendi.");
    }
}
