using Catalog.API.Products.CreateProduct;
using Catalog.API.Products.GetProducts;
using Catalog.API.Products.GetProductById;
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
    public async Task<IActionResult> GetProductById(Guid id)
    {
        // ID'ye göre ürün getir
        var result = await _mediator.Send(new GetProductByIdQuery(id));

        if (result == null)
        {
            return NotFound($"Ürün bulunamadı. ID: {id}");
        }

        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts()
    {
        // MediatR'a boş bir Query gönderiyoruz.
        // Handler otomatik bulunup çalışacak.
        var result = await _mediator.Send(new GetProductsQuery());

        return Ok(result);
    }
}