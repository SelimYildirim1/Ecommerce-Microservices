using System.Text.Json;
using MediatR;

namespace Catalog.API.Products.CreateProduct;

public record CreateVariantRequest(
    string Sku,
    decimal Price,
    int StockQuantity,
    JsonDocument? Specifics);

public record CreateProductCommand(
    string Name,
    string Description,
    Guid CategoryId,
    Guid BrandId,
    string? PrimaryImageUrl,
    List<CreateVariantRequest> Variants) : IRequest<Guid>;
