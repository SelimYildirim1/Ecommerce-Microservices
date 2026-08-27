using Catalog.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

/// <summary>Eski adres -> guncel adres esleme kaydi.</summary>
public record SlugRedirectDto(string From, string To);

/// <summary>Kategori ve marka yonlendirmeleri.</summary>
public record SlugRedirectMapDto(
    List<SlugRedirectDto> Categories,
    List<SlugRedirectDto> Brands);

/// <summary>
/// Slug degistiginde eski adresin nereye gidecegini soyler.
///
/// Vitrin middleware'i bu listeyi periyodik olarak cekip bellekte tutar;
/// boylece kategori/marka sayfasi isteginde ek bir servis cagrisi olmadan
/// kalici yonlendirme (301) donebilir. Sayfa icinde yonlendirme yapmak
/// yeterli degil: Next akisa (streaming) basladiktan sonra HTTP durumu
/// artik 200 olarak sabitlenmis oluyor.
/// </summary>
[Route("api/slug-redirects")]
[ApiController]
public class SlugRedirectsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public SlugRedirectsController(CatalogDbContext context) => _context = context;

    [HttpGet]
    public async Task<ActionResult<SlugRedirectMapDto>> Get(CancellationToken ct)
    {
        var categories = await _context.Categories
            .AsNoTracking()
            .Where(c => c.LegacySlug != null && c.Slug != null && c.LegacySlug != c.Slug)
            .Select(c => new SlugRedirectDto(c.LegacySlug!, c.Slug!))
            .ToListAsync(ct);

        var brands = await _context.Brands
            .AsNoTracking()
            .Where(b => b.LegacySlug != null && b.Slug != null && b.LegacySlug != b.Slug)
            .Select(b => new SlugRedirectDto(b.LegacySlug!, b.Slug!))
            .ToListAsync(ct);

        // Eski bir slug baska bir kaydin guncel slug'i ise yonlendirme yapilmaz;
        // aksi halde gecerli sayfa erisilemez hale gelir.
        var activeCategorySlugs = await _context.Categories
            .AsNoTracking()
            .Where(c => c.Slug != null)
            .Select(c => c.Slug!)
            .ToListAsync(ct);

        var activeBrandSlugs = await _context.Brands
            .AsNoTracking()
            .Where(b => b.Slug != null)
            .Select(b => b.Slug!)
            .ToListAsync(ct);

        return Ok(new SlugRedirectMapDto(
            Dedupe(categories, activeCategorySlugs),
            Dedupe(brands, activeBrandSlugs)));
    }

    /// <summary>
    /// Ayni eski slug'i birden fazla kayit iddia ediyorsa yonlendirme belirsiz
    /// olacagi icin atlanir.
    /// </summary>
    private static List<SlugRedirectDto> Dedupe(
        List<SlugRedirectDto> redirects, List<string> activeSlugs)
    {
        var active = activeSlugs.ToHashSet(StringComparer.OrdinalIgnoreCase);

        return redirects
            .Where(r => !active.Contains(r.From))
            .GroupBy(r => r.From, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Select(r => r.To).Distinct(StringComparer.OrdinalIgnoreCase).Count() == 1)
            .Select(g => g.First())
            .ToList();
    }
}
