using Catalog.API.Products.CreateProduct;
using Catalog.API.Products.DeleteProduct;
using Catalog.API.Products.GetProducts;
using Catalog.API.Products.GetProductById;
using Catalog.API.Products.SearchProducts;
using Catalog.API.Products.UpdateProduct;
using Catalog.API.Products.UpdateVariant;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Catalog.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ProductsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductCommand command)
    {
        // Controller'ın tek işi: İsteği alıp Mediator'e vermektir.
        // Business logic (iş mantığı) burada olmaz!
        var result = await _mediator.Send(command);

        return Ok(result); // Geriye yeni ürünün ID'si döner.
    }

    // ÖNEMLİ: Spesifik route'lar genel route'lardan ÖNCE olmalı!
    // Bu yüzden [HttpGet("{id}")] route'u [HttpGet] route'undan ÖNCE geliyor.
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProductById(Guid id, [FromQuery] bool includeInactive = false)
    {
        // ID'ye göre ürün getir
        var result = await _mediator.Send(new GetProductByIdQuery(id, includeInactive));

        if (result == null)
        {
            return NotFound($"Ürün bulunamadı. ID: {id}");
        }

        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] bool includeInactive = false)
    {
        // MediatR'a boş bir Query gönderiyoruz.
        // Handler otomatik bulunup çalışacak.
        var result = await _mediator.Send(new GetProductsQuery(includeInactive));

        return Ok(result);
    }

    /// <summary>
    /// Vitrin listeleme: arama, kategori/marka/fiyat filtresi, siralama ve sayfalama.
    /// Mevcut GET /api/products davranisi degismedigi icin geriye donuk uyumludur.
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] SearchProductsQuery query)
    {
        var result = await _mediator.Send(query);

        return Ok(result);
    }

    /// <summary>Filtre panelinde gosterilecek kategori/marka sayilari ve fiyat araligi.</summary>
    [HttpGet("facets")]
    public async Task<IActionResult> Facets([FromQuery] string? search, [FromQuery] Guid? categoryId)
    {
        var result = await _mediator.Send(new GetProductFacetsQuery(search, categoryId));

        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductCommand command)
    {
        var updated = await _mediator.Send(command with { Id = id });

        if (!updated) return NotFound($"Ürün bulunamadı. ID: {id}");

        return Ok(new { id });
    }

    /// <summary>Varsayilan olarak soft delete; ?permanent=true ile kalici siler.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id, [FromQuery] bool permanent = false)
    {
        var deleted = await _mediator.Send(new DeleteProductCommand(id, permanent));

        if (!deleted) return NotFound($"Ürün bulunamadı. ID: {id}");

        return NoContent();
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetProductStatusRequest request)
    {
        var updated = await _mediator.Send(new SetProductStatusCommand(id, request.IsActive));

        if (!updated) return NotFound($"Ürün bulunamadı. ID: {id}");

        return Ok(new { id, request.IsActive });
    }

    [HttpPut("{id:guid}/variants/{variantId:guid}")]
    public async Task<IActionResult> UpdateVariant(
        Guid id, Guid variantId, [FromBody] UpdateVariantRequestBody request)
    {
        var updated = await _mediator.Send(new UpdateVariantCommand(
            id, variantId, request.Price, request.StockQuantity, request.IsActive));

        if (!updated) return NotFound("Varyant bulunamadı.");

        return Ok(new { id, variantId });
    }
}

public record SetProductStatusRequest(bool IsActive);

public record UpdateVariantRequestBody(decimal? Price, int? StockQuantity, bool? IsActive);
