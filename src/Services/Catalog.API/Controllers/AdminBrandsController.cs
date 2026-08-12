using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

[Route("api/admin/brands")]
[ApiController]
public class AdminBrandsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminBrandsController(CatalogDbContext context)
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
                b.Slug,
                b.Description,
                b.MetaTitle,
                b.MetaDescription
            })
            .ToListAsync();

        return Ok(brands);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBrandRequest req)
    {
        var slug = await EnsureUniqueSlugAsync(SlugHelper.Slugify(req.Slug, req.Name));

        var brand = new Brand
        {
            Name = req.Name,
            LogoUrl = req.LogoUrl,
            Slug = slug,
            Description = req.Description,
            MetaTitle = req.MetaTitle,
            MetaDescription = req.MetaDescription
        };
        _context.Brands.Add(brand);
        await _context.SaveChangesAsync();
        return Ok(new { brand.Id, brand.Name, brand.Slug });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateBrandRequest req)
    {
        var brand = await _context.Brands.FindAsync(id);
        if (brand is null) return NotFound();

        brand.Name = req.Name;
        brand.LogoUrl = req.LogoUrl;
        brand.Slug = await EnsureUniqueSlugAsync(SlugHelper.Slugify(req.Slug, req.Name), id);
        brand.Description = req.Description;
        brand.MetaTitle = req.MetaTitle;
        brand.MetaDescription = req.MetaDescription;
        brand.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { brand.Id, brand.Slug });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var brand = await _context.Brands
            .Include(b => b.Products)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (brand is null) return NotFound();
        if (brand.Products.Any()) return BadRequest("Ürünleri olan marka silinemez.");

        _context.Brands.Remove(brand);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug, Guid? excludeId = null)
    {
        var slug = string.IsNullOrWhiteSpace(baseSlug) ? "marka" : baseSlug;
        var candidate = slug;
        var i = 2;

        while (await _context.Brands.AnyAsync(b =>
                   b.Slug == candidate && (!excludeId.HasValue || b.Id != excludeId.Value)))
        {
            candidate = $"{slug}-{i++}";
        }

        return candidate;
    }
}

public record CreateBrandRequest(
    string Name,
    string? LogoUrl,
    string? Slug = null,
    string? Description = null,
    string? MetaTitle = null,
    string? MetaDescription = null);
