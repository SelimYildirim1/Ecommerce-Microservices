using Catalog.API.Data;
using Catalog.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

[Route("api/admin/attributes")]
[ApiController]
public class AdminAttributesController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminAttributesController(CatalogDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var attrs = await _context.ProductAttributes
            .AsNoTracking()
            .OrderBy(a => a.Name)
            .Select(a => new AttributeListDto
            {
                Id = a.Id,
                Name = a.Name,
                Code = a.Code,
                DataType = a.DataType,
                Options = a.Options,
                IsRequired = a.IsRequired,
                IsVariant = a.IsVariant
            })
            .ToListAsync();

        return Ok(attrs);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var attr = await _context.ProductAttributes.FindAsync(id);
        if (attr is null) return NotFound();
        return Ok(attr);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAttributeRequest req)
    {
        var attr = new ProductAttribute
        {
            Name = req.Name,
            Code = req.Code,
            DataType = req.DataType,
            Options = req.Options,
            IsRequired = req.IsRequired,
            IsVariant = req.IsVariant
        };

        _context.ProductAttributes.Add(attr);
        await _context.SaveChangesAsync();
        return Ok(new { attr.Id, attr.Name, attr.Code });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateAttributeRequest req)
    {
        var attr = await _context.ProductAttributes.FindAsync(id);
        if (attr is null) return NotFound();

        attr.Name = req.Name;
        attr.Code = req.Code;
        attr.DataType = req.DataType;
        attr.Options = req.Options;
        attr.IsRequired = req.IsRequired;
        attr.IsVariant = req.IsVariant;
        attr.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { attr.Id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var attr = await _context.ProductAttributes
            .Include(a => a.CategoryAttributes)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (attr is null) return NotFound();
        if (attr.CategoryAttributes.Any())
            return BadRequest("Kategorilere atanmış özellik silinemez. Önce atamaları kaldırın.");

        _context.ProductAttributes.Remove(attr);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateAttributeRequest(
    string Name, string Code, string DataType,
    string? Options, bool IsRequired, bool IsVariant);

public class AttributeListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string Code { get; set; } = default!;
    public string DataType { get; set; } = default!;
    public string? Options { get; set; }
    public bool IsRequired { get; set; }
    public bool IsVariant { get; set; }
}
