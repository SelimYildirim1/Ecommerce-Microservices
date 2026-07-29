using Catalog.API.Data;
using Catalog.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

public record SaveBannerRequest(
    string Title,
    string? Subtitle,
    string ImageUrl,
    string? LinkUrl,
    string? Placement,
    int SortOrder,
    bool IsActive,
    DateTime? StartsAt,
    DateTime? EndsAt);

public record SaveStaticPageRequest(
    string Slug,
    string Title,
    string? Content,
    string? MetaTitle,
    string? MetaDescription,
    bool IsPublished,
    bool ShowInFooter,
    int SortOrder);

/// <summary>Panel icerik yonetimi: banner ve statik sayfalar.</summary>
[Route("api/admin/cms")]
[ApiController]
public class AdminCmsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminCmsController(CatalogDbContext context)
    {
        _context = context;
    }

    // --- Banner ---

    [HttpGet("banners")]
    public async Task<ActionResult<List<Banner>>> GetBanners([FromQuery] string? placement)
    {
        var query = _context.Banners.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(placement))
            query = query.Where(b => b.Placement == placement);

        return Ok(await query
            .OrderBy(b => b.Placement)
            .ThenBy(b => b.SortOrder)
            .ToListAsync());
    }

    [HttpPost("banners")]
    public async Task<ActionResult<Banner>> CreateBanner([FromBody] SaveBannerRequest request)
    {
        var banner = new Banner();
        Apply(banner, request);

        _context.Banners.Add(banner);
        await _context.SaveChangesAsync();

        return Ok(banner);
    }

    [HttpPut("banners/{id:guid}")]
    public async Task<ActionResult<Banner>> UpdateBanner(Guid id, [FromBody] SaveBannerRequest request)
    {
        var banner = await _context.Banners.FindAsync(id);
        if (banner is null) return NotFound();

        Apply(banner, request);
        banner.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(banner);
    }

    [HttpDelete("banners/{id:guid}")]
    public async Task<IActionResult> DeleteBanner(Guid id)
    {
        var banner = await _context.Banners.FindAsync(id);
        if (banner is null) return NotFound();

        _context.Banners.Remove(banner);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // --- Statik sayfa ---

    [HttpGet("pages")]
    public async Task<ActionResult<List<StaticPage>>> GetPages()
    {
        return Ok(await _context.StaticPages
            .AsNoTracking()
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Title)
            .ToListAsync());
    }

    [HttpGet("pages/{id:guid}")]
    public async Task<ActionResult<StaticPage>> GetPage(Guid id)
    {
        var page = await _context.StaticPages.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);

        return page is null ? NotFound() : Ok(page);
    }

    [HttpPost("pages")]
    public async Task<ActionResult<StaticPage>> CreatePage([FromBody] SaveStaticPageRequest request)
    {
        var slug = Slugify(request.Slug, request.Title);

        if (await _context.StaticPages.AnyAsync(p => p.Slug == slug))
            return BadRequest($"'{slug}' adresi zaten kullanılıyor.");

        var page = new StaticPage();
        Apply(page, request, slug);

        _context.StaticPages.Add(page);
        await _context.SaveChangesAsync();

        return Ok(page);
    }

    [HttpPut("pages/{id:guid}")]
    public async Task<ActionResult<StaticPage>> UpdatePage(Guid id, [FromBody] SaveStaticPageRequest request)
    {
        var page = await _context.StaticPages.FindAsync(id);
        if (page is null) return NotFound();

        var slug = Slugify(request.Slug, request.Title);

        if (await _context.StaticPages.AnyAsync(p => p.Slug == slug && p.Id != id))
            return BadRequest($"'{slug}' adresi zaten kullanılıyor.");

        Apply(page, request, slug);
        page.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(page);
    }

    [HttpDelete("pages/{id:guid}")]
    public async Task<IActionResult> DeletePage(Guid id)
    {
        var page = await _context.StaticPages.FindAsync(id);
        if (page is null) return NotFound();

        _context.StaticPages.Remove(page);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static void Apply(Banner banner, SaveBannerRequest r)
    {
        banner.Title = r.Title.Trim();
        banner.Subtitle = r.Subtitle?.Trim();
        banner.ImageUrl = r.ImageUrl.Trim();
        banner.LinkUrl = r.LinkUrl?.Trim();
        banner.Placement = string.IsNullOrWhiteSpace(r.Placement) ? "home-slider" : r.Placement.Trim();
        banner.SortOrder = r.SortOrder;
        banner.IsActive = r.IsActive;
        banner.StartsAt = r.StartsAt;
        banner.EndsAt = r.EndsAt;
    }

    private static void Apply(StaticPage page, SaveStaticPageRequest r, string slug)
    {
        page.Slug = slug;
        page.Title = r.Title.Trim();
        page.Content = r.Content ?? string.Empty;
        page.MetaTitle = r.MetaTitle?.Trim();
        page.MetaDescription = r.MetaDescription?.Trim();
        page.IsPublished = r.IsPublished;
        page.ShowInFooter = r.ShowInFooter;
        page.SortOrder = r.SortOrder;
    }

    /// <summary>Bos birakilan slug basliktan uretilir; Turkce karakterler sadelestirilir.</summary>
    private static string Slugify(string? slug, string title)
    {
        var source = string.IsNullOrWhiteSpace(slug) ? title : slug;

        var replacements = new Dictionary<char, char>
        {
            ['ı'] = 'i', ['İ'] = 'i', ['ğ'] = 'g', ['Ğ'] = 'g',
            ['ü'] = 'u', ['Ü'] = 'u', ['ş'] = 's', ['Ş'] = 's',
            ['ö'] = 'o', ['Ö'] = 'o', ['ç'] = 'c', ['Ç'] = 'c'
        };

        var builder = new System.Text.StringBuilder();

        foreach (var c in source.Trim().ToLowerInvariant())
        {
            var mapped = replacements.TryGetValue(c, out var r) ? r : c;

            if (char.IsLetterOrDigit(mapped)) builder.Append(mapped);
            else if (mapped is ' ' or '-' or '_') builder.Append('-');
        }

        return builder.ToString().Trim('-');
    }
}

/// <summary>Vitrinin okudugu yayindaki icerikler.</summary>
[Route("api/cms")]
[ApiController]
public class PublicCmsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public PublicCmsController(CatalogDbContext context)
    {
        _context = context;
    }

    /// <summary>Yayin tarihi araligindaki aktif bannerlar.</summary>
    [HttpGet("banners")]
    public async Task<ActionResult<List<Banner>>> GetBanners([FromQuery] string placement = "home-slider")
    {
        var now = DateTime.UtcNow;

        var banners = await _context.Banners
            .AsNoTracking()
            .Where(b =>
                b.IsActive &&
                b.Placement == placement &&
                (b.StartsAt == null || b.StartsAt <= now) &&
                (b.EndsAt == null || b.EndsAt >= now))
            .OrderBy(b => b.SortOrder)
            .ToListAsync();

        return Ok(banners);
    }

    [HttpGet("pages")]
    public async Task<ActionResult<List<object>>> GetPages([FromQuery] bool footerOnly = false)
    {
        var query = _context.StaticPages.AsNoTracking().Where(p => p.IsPublished);

        if (footerOnly) query = query.Where(p => p.ShowInFooter);

        var pages = await query
            .OrderBy(p => p.SortOrder)
            .Select(p => new { p.Slug, p.Title })
            .ToListAsync();

        return Ok(pages.Cast<object>().ToList());
    }

    [HttpGet("pages/{slug}")]
    public async Task<ActionResult<StaticPage>> GetPage(string slug)
    {
        var page = await _context.StaticPages
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished);

        return page is null ? NotFound() : Ok(page);
    }
}
