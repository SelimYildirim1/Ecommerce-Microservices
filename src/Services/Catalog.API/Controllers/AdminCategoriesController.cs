using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Helpers;
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
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .ToListAsync();

        var tree = categories
            .Where(c => c.ParentId == null)
            .Select(c => MapToTree(c, categories))
            .ToList();

        return Ok(tree);
    }

    /// <summary>Tek kategori detayı (attribute'larıyla; üst kategorilerden miras)</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var categories = await _context.Categories
            .AsNoTracking()
            .Include(c => c.CategoryAttributes)
                .ThenInclude(ca => ca.ProductAttribute)
            .ToListAsync();

        var cat = categories.FirstOrDefault(c => c.Id == id);
        if (cat is null) return NotFound();

        // Alt kategoriye özel özellikler + üst zincirden miras (aynı attribute tekrar eklenmez)
        var attributes = new List<CategoryAttributeDto>();
        var seen = new HashSet<Guid>();
        var cursor = cat;
        var depthOrder = 0;
        while (cursor is not null)
        {
            foreach (var ca in cursor.CategoryAttributes.OrderBy(a => a.SortOrder))
            {
                if (!seen.Add(ca.ProductAttributeId)) continue;
                attributes.Add(new CategoryAttributeDto
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
                    SortOrder = depthOrder * 100 + ca.SortOrder
                });
            }

            depthOrder++;
            var parentId = cursor.ParentId;
            cursor = parentId.HasValue
                ? categories.FirstOrDefault(c => c.Id == parentId.Value)
                : null;
        }

        return Ok(new CategoryDetailDto
        {
            Id = cat.Id,
            Name = cat.Name,
            ParentId = cat.ParentId,
            Slug = cat.Slug,
            ImageUrl = cat.ImageUrl,
            SortOrder = cat.SortOrder,
            IsFeatured = cat.IsFeatured,
            ShowInMenu = cat.ShowInMenu,
            MetaTitle = cat.MetaTitle,
            MetaDescription = cat.MetaDescription,
            Attributes = attributes.OrderBy(a => a.SortOrder).ToList()
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveCategoryRequest req)
    {
        var slug = await EnsureUniqueSlugAsync(SlugHelper.Slugify(req.Slug, req.Name));

        var category = new Category
        {
            Name = req.Name,
            ParentId = req.ParentId,
            Slug = slug,
            ImageUrl = string.IsNullOrWhiteSpace(req.ImageUrl) ? null : req.ImageUrl.Trim(),
            SortOrder = req.SortOrder ?? 0,
            IsFeatured = req.IsFeatured ?? false,
            ShowInMenu = req.ShowInMenu ?? true,
            MetaTitle = string.IsNullOrWhiteSpace(req.MetaTitle) ? null : req.MetaTitle.Trim(),
            MetaDescription = string.IsNullOrWhiteSpace(req.MetaDescription) ? null : req.MetaDescription.Trim()
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return Ok(MapToTree(category, new List<Category> { category }));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveCategoryRequest req)
    {
        var cat = await _context.Categories.FindAsync(id);
        if (cat is null) return NotFound();

        cat.Name = req.Name;
        cat.ParentId = req.ParentId;
        cat.Slug = await EnsureUniqueSlugAsync(SlugHelper.Slugify(req.Slug, req.Name), id);
        if (req.ImageUrl is not null)
            cat.ImageUrl = string.IsNullOrWhiteSpace(req.ImageUrl) ? null : req.ImageUrl.Trim();
        if (req.SortOrder.HasValue) cat.SortOrder = req.SortOrder.Value;
        if (req.IsFeatured.HasValue) cat.IsFeatured = req.IsFeatured.Value;
        if (req.ShowInMenu.HasValue) cat.ShowInMenu = req.ShowInMenu.Value;
        if (req.MetaTitle is not null)
            cat.MetaTitle = string.IsNullOrWhiteSpace(req.MetaTitle) ? null : req.MetaTitle.Trim();
        if (req.MetaDescription is not null)
            cat.MetaDescription = string.IsNullOrWhiteSpace(req.MetaDescription) ? null : req.MetaDescription.Trim();
        cat.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new
        {
            cat.Id,
            cat.Name,
            cat.ParentId,
            cat.Slug,
            cat.ImageUrl,
            cat.SortOrder,
            cat.IsFeatured,
            cat.ShowInMenu,
            cat.MetaTitle,
            cat.MetaDescription
        });
    }

    /// <summary>Kardeş kategorilerin sıralamasını günceller (DnD).</summary>
    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] ReorderCategoriesRequest req)
    {
        if (req.Items is null || req.Items.Count == 0)
            return BadRequest("Sıralama listesi boş.");

        var ids = req.Items.Select(i => i.Id).ToList();
        var categories = await _context.Categories
            .Where(c => ids.Contains(c.Id))
            .ToListAsync();

        foreach (var item in req.Items)
        {
            var cat = categories.FirstOrDefault(c => c.Id == item.Id);
            if (cat is null) continue;
            cat.SortOrder = item.SortOrder;
            if (item.ParentId.HasValue || item.ClearParent)
                cat.ParentId = item.ClearParent ? null : item.ParentId;
            cat.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { updated = categories.Count });
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

    private async Task<string> EnsureUniqueSlugAsync(string slug, Guid? excludeId = null)
    {
        if (string.IsNullOrWhiteSpace(slug)) slug = "kategori";

        var candidate = slug;
        var i = 2;
        while (await _context.Categories.AnyAsync(c =>
                   c.Slug == candidate && (!excludeId.HasValue || c.Id != excludeId.Value)))
        {
            candidate = $"{slug}-{i++}";
        }

        return candidate;
    }

    private static CategoryTreeDto MapToTree(Category c, List<Category> all)
    {
        return new CategoryTreeDto
        {
            Id = c.Id,
            Name = c.Name,
            ParentId = c.ParentId,
            Slug = c.Slug,
            ImageUrl = c.ImageUrl,
            SortOrder = c.SortOrder,
            IsFeatured = c.IsFeatured,
            ShowInMenu = c.ShowInMenu,
            MetaTitle = c.MetaTitle,
            MetaDescription = c.MetaDescription,
            AttributeCount = c.CategoryAttributes?.Count ?? 0,
            Children = all
                .Where(x => x.ParentId == c.Id)
                .Select(x => MapToTree(x, all))
                .ToList()
        };
    }
}

/// <summary>
/// Yeni alanlar opsiyoneldir — eski admin istemcileri sadece Name/ParentId gönderse de çalışır.
/// </summary>
public record SaveCategoryRequest(
    string Name,
    Guid? ParentId,
    string? Slug = null,
    string? ImageUrl = null,
    int? SortOrder = null,
    bool? IsFeatured = null,
    bool? ShowInMenu = null,
    string? MetaTitle = null,
    string? MetaDescription = null);

public record ReorderCategoriesRequest(List<ReorderCategoryItem> Items);

public record ReorderCategoryItem(
    Guid Id,
    int SortOrder,
    Guid? ParentId = null,
    bool ClearParent = false);

public record AssignAttributeRequest(Guid AttributeId, int SortOrder = 0, bool IsFilterable = true);

public class CategoryTreeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid? ParentId { get; set; }
    public string? Slug { get; set; }
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsFeatured { get; set; }
    public bool ShowInMenu { get; set; } = true;
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public int AttributeCount { get; set; }
    public List<CategoryTreeDto> Children { get; set; } = new();
}

public class CategoryDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid? ParentId { get; set; }
    public string? Slug { get; set; }
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsFeatured { get; set; }
    public bool ShowInMenu { get; set; } = true;
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
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
