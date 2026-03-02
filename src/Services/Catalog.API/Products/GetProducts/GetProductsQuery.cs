using System.Text.Json;
using MediatR;

namespace Catalog.API.Products.GetProducts;

// DTO'lar
public record ProductDto(
    Guid Id,
    string Name,
    string Description,
    string CategoryName,
    string BrandName,
    string? PrimaryImageUrl,
    bool IsActive,
    decimal Price,
    int Stock,
    List<VariantDto> Variants);

public record VariantDto(
    Guid Id,
    string Sku,
    decimal Price,
    int StockQuantity,
    JsonDocument? Specifics,
    bool IsActive);

// Query
public record GetProductsQuery() : IRequest<IEnumerable<ProductDto>>;
