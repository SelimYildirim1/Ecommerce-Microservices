using System.Text.Json;
using MediatR;

namespace Catalog.API.Products.CreateProduct;

public record CreateVariantRequest(
    string Sku,
    decimal Price,
    int StockQuantity,
    JsonDocument? Specifics);

public record CreateProductImageRequest(
    string Url,
    bool IsPrimary,
    int SortOrder);

public record CreateProductCommand(
    string Name,
    string Description,
    Guid CategoryId,
    Guid BrandId,
    string? PrimaryImageUrl,
    List<CreateVariantRequest> Variants,
    string? Slug = null,
    string? MetaTitle = null,
    string? MetaDescription = null,
    List<CreateProductImageRequest>? Images = null) : IRequest<Guid>;
