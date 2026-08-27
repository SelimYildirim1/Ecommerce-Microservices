using Catalog.API.Data;
using Catalog.API.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

[Route("api/brands")]
[ApiController]
public class BrandsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public BrandsController(CatalogDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var brands = await _context.Brands
            .AsNoTracking()
            .OrderBy(b => b.Name)
            .Select(b => new
            {
                b.Id,
                b.Name,
                b.LogoUrl,
                Slug = b.Slug ?? "",
                b.Description,
                ProductCount = b.Products.Count(p => p.IsActive)
            })
            .ToListAsync();

        return Ok(brands);
    }

    [HttpGet("by-slug/{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var normalized = slug.Trim().ToLowerInvariant();

        var brand = await _context.Brands
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Slug != null && b.Slug.ToLower() == normalized);

        // Slug duzeltmesinden onceki adresler LegacySlug'ta durur.
        brand ??= await _context.Brands
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.LegacySlug != null && b.LegacySlug.ToLower() == normalized);

        if (brand is null)
        {
            var all = await _context.Brands.AsNoTracking().ToListAsync();
            brand = all.FirstOrDefault(b =>
                string.Equals(SlugHelper.Slugify(b.Slug, b.Name), normalized, StringComparison.OrdinalIgnoreCase));
        }

        if (brand is null) return NotFound();

        return Ok(new
        {
            brand.Id,
            brand.Name,
            brand.LogoUrl,
            Slug = brand.Slug ?? SlugHelper.Slugify(null, brand.Name),
            brand.Description,
            brand.MetaTitle,
            brand.MetaDescription
        });
    }
}
