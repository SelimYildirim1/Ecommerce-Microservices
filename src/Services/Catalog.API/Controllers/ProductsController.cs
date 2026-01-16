using Catalog.API.Products.CreateProduct;
using Catalog.API.Products.GetProducts; // <-- BU SATIR EKSİK
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

    // MEVCUT KODLARIN ALTINA EKLE...

    [HttpGet]
    public async Task<IActionResult> GetProducts()
    {
        // MediatR'a boş bir Query gönderiyoruz.
        // Handler otomatik bulunup çalışacak.
        var result = await _mediator.Send(new GetProductsQuery());

        return Ok(result);
    }
}