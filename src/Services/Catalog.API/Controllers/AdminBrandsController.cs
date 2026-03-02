using Catalog.API.Data;
using Catalog.API.Entities;
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
            .Select(b => new { b.Id, b.Name, b.LogoUrl })
            .ToListAsync();

        return Ok(brands);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBrandRequest req)
    {
        var brand = new Brand { Name = req.Name, LogoUrl = req.LogoUrl };
        _context.Brands.Add(brand);
        await _context.SaveChangesAsync();
        return Ok(new { brand.Id, brand.Name });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateBrandRequest req)
    {
        var brand = await _context.Brands.FindAsync(id);
        if (brand is null) return NotFound();

        brand.Name = req.Name;
        brand.LogoUrl = req.LogoUrl;
        brand.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { brand.Id });
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
}

public record CreateBrandRequest(string Name, string? LogoUrl);
