using Catalog.API.Data;
using Catalog.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

[Route("api/admin/categories")]
[ApiController]
public class AdminCategoriesController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminCategoriesController(CatalogDbContext context)
    {
        _context = context;
    }

    /// <summary>Tüm kategorileri ağaç yapısında döner</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _context.Categories
            .AsNoTracking()
            .Include(c => c.CategoryAttributes)
                .ThenInclude(ca => ca.ProductAttribute)
            .OrderBy(c => c.Name)
            .ToListAsync();

        var tree = categories
            .Where(c => c.ParentId == null)
            .Select(c => MapToTree(c, categories))
            .ToList();

        return Ok(tree);
    }

    /// <summary>Tek kategori detayı (attribute'larıyla)</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var cat = await _context.Categories
            .AsNoTracking()
            .Include(c => c.CategoryAttributes)
                .ThenInclude(ca => ca.ProductAttribute)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cat is null) return NotFound();

        return Ok(new CategoryDetailDto
        {
            Id = cat.Id,
            Name = cat.Name,
            ParentId = cat.ParentId,
            Attributes = cat.CategoryAttributes.Select(ca => new CategoryAttributeDto
            {
                Id = ca.Id,
                AttributeId = ca.ProductAttributeId,
                AttributeName = ca.ProductAttribute.Name,
                AttributeCode = ca.ProductAttribute.Code,
                DataType = ca.ProductAttribute.DataType,
                Options = ca.ProductAttribute.Options,
                IsRequired = ca.ProductAttribute.IsRequired,
                IsVariant = ca.ProductAttribute.IsVariant,
                IsFilterable = ca.IsFilterable,
                SortOrder = ca.SortOrder
            }).OrderBy(a => a.SortOrder).ToList()
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
    {
        var category = new Category { Name = req.Name, ParentId = req.ParentId };
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return Ok(new { category.Id, category.Name });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCategoryRequest req)
    {
        var cat = await _context.Categories.FindAsync(id);
        if (cat is null) return NotFound();

        cat.Name = req.Name;
        cat.ParentId = req.ParentId;
        cat.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(new { cat.Id, cat.Name });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var cat = await _context.Categories
            .Include(c => c.Children)
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cat is null) return NotFound();
        if (cat.Children.Any()) return BadRequest("Alt kategorileri olan kategori silinemez.");
        if (cat.Products.Any()) return BadRequest("Ürünleri olan kategori silinemez.");

        _context.Categories.Remove(cat);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Kategoriye attribute ata</summary>
    [HttpPost("{categoryId:guid}/attributes")]
    public async Task<IActionResult> AssignAttribute(Guid categoryId, [FromBody] AssignAttributeRequest req)
    {
        var exists = await _context.CategoryAttributes
            .AnyAsync(ca => ca.CategoryId == categoryId && ca.ProductAttributeId == req.AttributeId);

        if (exists) return BadRequest("Bu özellik zaten bu kategoriye atanmış.");

        var ca = new Entities.CategoryAttribute
        {
            CategoryId = categoryId,
            ProductAttributeId = req.AttributeId,
            SortOrder = req.SortOrder,
            IsFilterable = req.IsFilterable
        };

        _context.CategoryAttributes.Add(ca);
        await _context.SaveChangesAsync();
        return Ok(new { ca.Id });
    }

    [HttpDelete("{categoryId:guid}/attributes/{attributeId:guid}")]
    public async Task<IActionResult> RemoveAttribute(Guid categoryId, Guid attributeId)
    {
        var ca = await _context.CategoryAttributes
            .FirstOrDefaultAsync(x => x.CategoryId == categoryId && x.ProductAttributeId == attributeId);

        if (ca is null) return NotFound();

        _context.CategoryAttributes.Remove(ca);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static CategoryTreeDto MapToTree(Category c, List<Category> all)
    {
        return new CategoryTreeDto
        {
            Id = c.Id,
            Name = c.Name,
            ParentId = c.ParentId,
            AttributeCount = c.CategoryAttributes.Count,
            Children = all
                .Where(x => x.ParentId == c.Id)
                .Select(x => MapToTree(x, all))
                .ToList()
        };
    }
}

// DTOs
public record CreateCategoryRequest(string Name, Guid? ParentId);
public record UpdateCategoryRequest(string Name, Guid? ParentId);
public record AssignAttributeRequest(Guid AttributeId, int SortOrder = 0, bool IsFilterable = true);

public class CategoryTreeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid? ParentId { get; set; }
    public int AttributeCount { get; set; }
    public List<CategoryTreeDto> Children { get; set; } = new();
}

public class CategoryDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid? ParentId { get; set; }
    public List<CategoryAttributeDto> Attributes { get; set; } = new();
}

public class CategoryAttributeDto
{
    public Guid Id { get; set; }
    public Guid AttributeId { get; set; }
    public string AttributeName { get; set; } = default!;
    public string AttributeCode { get; set; } = default!;
    public string DataType { get; set; } = default!;
    public string? Options { get; set; }
    public bool IsRequired { get; set; }
    public bool IsVariant { get; set; }
    public bool IsFilterable { get; set; }
    public int SortOrder { get; set; }
}
