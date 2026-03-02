using Catalog.API.Categories.GetCategoryFilters;
using Catalog.API.Products.GetProductsByCategory;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class CategoriesController : ControllerBase
{
    private readonly IMediator _mediator;

    public CategoriesController(IMediator mediator)
    {
        _mediator = mediator;
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
