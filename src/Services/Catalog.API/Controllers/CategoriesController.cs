using Catalog.API.Categories.GetCategoryFilters;
using Catalog.API.Data;
using Catalog.API.Products.GetProductsByCategory;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CategoriesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly CatalogDbContext _context;

    public CategoriesController(IMediator mediator, CatalogDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    /// <summary>
    /// Vitrin menüsü ve kategori şeridi için tüm kategorileri döner.
    /// Görseli olan kategoriler ana sayfadaki şeritte gösterilir.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var categories = await _context.Categories
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new StorefrontCategoryDto(
                c.Id,
                c.Name,
                c.ParentId,
                c.ImageUrl,
                c.SortOrder,
                c.Products.Count(p => p.IsActive)))
            .ToListAsync(ct);

        return Ok(categories);
    }

    /// <summary>
    /// Kategorinin filtrelenebilir özelliklerini ve mevcut değerlerini döner.
    /// Frontend sol menüdeki filtre panelini bu endpoint ile oluşturur.
    /// </summary>
    [HttpGet("{categoryId:guid}/filters")]
    public async Task<IActionResult> GetCategoryFilters(Guid categoryId)
    {
        var result = await _mediator.Send(new GetCategoryFiltersQuery(categoryId));

        if (result is null)
            return NotFound($"Kategori bulunamadı. ID: {categoryId}");

        return Ok(result);
    }

    /// <summary>
    /// Kategoriye göre ürünleri getirir. Query string ile JSONB filtreleme destekler.
    /// Örnek: /api/categories/{id}/products?ram=16GB&color=Siyah
    /// </summary>
    [HttpGet("{categoryId:guid}/products")]
    public async Task<IActionResult> GetProductsByCategory(
        Guid categoryId,
        [FromQuery] Dictionary<string, string>? filters)
    {
        // "categoryId" key'ini filtrelerden çıkar (query string'den otomatik gelir)
        filters?.Remove("categoryId");

        var result = await _mediator.Send(new GetProductsByCategoryQuery(categoryId, filters));
        return Ok(result);
    }
}

/// <summary>Vitrinde kullanılan sade kategori görünümü.</summary>
public record StorefrontCategoryDto(
    Guid Id,
    string Name,
    Guid? ParentId,
    string? ImageUrl,
    int SortOrder,
    int ProductCount);
