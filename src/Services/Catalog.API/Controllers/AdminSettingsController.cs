using Catalog.API.Data;
using Catalog.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

public record SettingDto(string Key, string? Value, string Group, string? Description);

public record SaveSettingsRequest(Dictionary<string, string?> Values);

/// <summary>
/// Site ayarlari. Anahtar-deger oldugu icin yeni ayar eklemek migration
/// gerektirmez; bilinmeyen anahtarlar varsayilanlariyla olusturulur.
/// </summary>
[Route("api/admin/settings")]
[ApiController]
public class AdminSettingsController : ControllerBase
{
    /// <summary>Panelde her zaman gorunmesi gereken ayarlar ve varsayilanlari.</summary>
    private static readonly SettingDto[] Defaults =
    {
        new("site.name", "Yıldırım Store", "general", "Mağaza adı"),
        new("site.description", "En yeni ürünler, en uygun fiyatlarla.", "general", "Kısa açıklama"),
        new("site.email", "info@yildirimstore.com", "general", "İletişim e-postası"),
        new("site.phone", "0850 000 00 00", "general", "İletişim telefonu"),
        new("site.address", "", "general", "Şirket adresi"),
        new("site.announcement", "Ücretsiz kargo · Güvenli ödeme · Kolay iade — Yıldırım Store'a hoş geldiniz", "general", "Üst şerit slogan (sağdan sola kayar; boş bırakırsanız gizlenir)"),
        new("site.announcementEnabled", "true", "general", "Üst slogan şeridi aktif mi?"),

        new("seo.defaultTitle", "Yıldırım Store", "seo", "Varsayılan sayfa başlığı"),
        new("seo.defaultDescription", "En yeni ürünler, en uygun fiyatlarla.", "seo", "Varsayılan meta açıklama"),
        new("seo.titleSuffix", " | Yıldırım Store", "seo", "Başlık soneki"),
        new("seo.ogImage", "", "seo", "Varsayılan Open Graph görseli"),
        new("seo.robots", "index,follow", "seo", "Robots meta"),
        new("seo.googleAnalyticsId", "", "seo", "Google Analytics ID"),
        new("seo.googleSiteVerification", "", "seo", "Google site doğrulama"),

        new("commerce.currency", "TRY", "commerce", "Para birimi"),
        new("commerce.currencySymbol", "₺", "commerce", "Para birimi sembolü"),
        new("commerce.vatRate", "20", "tax", "KDV oranı (%)"),
        new("commerce.pricesIncludeVat", "true", "tax", "Fiyatlara KDV dahil mi?"),
        new("commerce.lowStockThreshold", "10", "commerce", "Kritik stok eşiği"),
        new("commerce.installmentRates", "{\"3\":0,\"6\":0.02,\"9\":0.04,\"12\":0.06}", "payment", "Taksit faiz oranları (JSON)"),
        new("commerce.transferAccounts", "[]", "payment", "Havale/EFT hesapları (JSON)"),
        new("commerce.codFee", "0", "payment", "Kapıda ödeme ücreti"),
        new("commerce.codEnabled", "true", "payment", "Kapıda ödeme aktif mi?"),

        new("shipping.freeThreshold", "500", "shipping", "Ücretsiz kargo alt limiti"),
        new("shipping.defaultCost", "49.90", "shipping", "Varsayılan kargo ücreti"),
        new("shipping.estimatedDays", "3", "shipping", "Tahmini teslim süresi (gün)"),

        new("email.senderName", "Yıldırım Store", "email", "Gönderen adı"),
        new("email.senderAddress", "no-reply@yildirimstore.com", "email", "Gönderen adresi"),
        new("email.orderConfirmationSubject", "Siparişiniz alındı", "email", "Sipariş onay e-postası konusu"),
        new("email.shippingSubject", "Siparişiniz kargoya verildi", "email", "Kargo e-postası konusu"),

        new("social.instagram", "", "social", "Instagram adresi"),
        new("social.twitter", "", "social", "X / Twitter adresi"),
        new("social.facebook", "", "social", "Facebook adresi")
    };

    private readonly CatalogDbContext _context;

    public AdminSettingsController(CatalogDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<SettingDto>>> GetAll([FromQuery] string? group)
    {
        var stored = await _context.SiteSettings.AsNoTracking().ToListAsync();
        var storedMap = stored.ToDictionary(s => s.Key, s => s);

        // Varsayilanlar ile kayitlilar birlestirilir; kayitli deger onceliklidir
        var merged = Defaults
            .Select(d => storedMap.TryGetValue(d.Key, out var s)
                ? new SettingDto(d.Key, s.Value, d.Group, d.Description)
                : d)
            .Concat(stored
                .Where(s => !Defaults.Any(d => d.Key == s.Key))
                .Select(s => new SettingDto(s.Key, s.Value, s.Group, s.Description)))
            .ToList();

        if (!string.IsNullOrWhiteSpace(group))
            merged = merged.Where(s => s.Group == group).ToList();

        return Ok(merged);
    }

    [HttpPut]
    public async Task<ActionResult<List<SettingDto>>> Save([FromBody] SaveSettingsRequest request)
    {
        if (request.Values is null || request.Values.Count == 0)
            return BadRequest("Kaydedilecek ayar gönderilmedi.");

        var keys = request.Values.Keys.ToList();

        var existing = await _context.SiteSettings
            .Where(s => keys.Contains(s.Key))
            .ToListAsync();

        foreach (var (key, value) in request.Values)
        {
            var setting = existing.FirstOrDefault(s => s.Key == key);

            if (setting is null)
            {
                var template = Defaults.FirstOrDefault(d => d.Key == key);

                _context.SiteSettings.Add(new SiteSetting
                {
                    Key = key,
                    Value = value,
                    Group = template?.Group ?? "general",
                    Description = template?.Description
                });
            }
            else
            {
                setting.Value = value;
                setting.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        return await GetAll(null);
    }
}

/// <summary>Vitrinin okuyabilecegi genel ayarlar.</summary>
[Route("api/settings")]
[ApiController]
public class PublicSettingsController : ControllerBase
{
    /// <summary>Gizli kalmasi gereken gruplar vitrine acilmaz.</summary>
    private static readonly string[] PublicGroups = { "general", "commerce", "shipping", "social", "seo", "payment", "tax" };

    private readonly CatalogDbContext _context;

    public PublicSettingsController(CatalogDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<Dictionary<string, string?>>> Get()
    {
        var settings = await _context.SiteSettings
            .AsNoTracking()
            .Where(s => PublicGroups.Contains(s.Group))
            .ToListAsync();

        return Ok(settings.ToDictionary(s => s.Key, s => s.Value));
    }
}
