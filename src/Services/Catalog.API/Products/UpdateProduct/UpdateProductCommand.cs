using System.Text.Json;
using MediatR;

namespace Catalog.API.Products.UpdateProduct;

/// <summary>
/// Varyant satiri. Id dolu ise mevcut varyant guncellenir,
/// bos ise yeni varyant eklenir. Listede olmayan varyantlar pasife alinir.
/// </summary>
public record UpdateVariantRequest(
    Guid? Id,
    string Sku,
    decimal Price,
    int StockQuantity,
    JsonDocument? Specifics,
    bool IsActive = true);

public record UpdateProductImageRequest(
    string Url,
    bool IsPrimary,
    int SortOrder);

public record UpdateProductCommand(
    Guid Id,
    string Name,
    string Description,
    Guid CategoryId,
    Guid BrandId,
    string? PrimaryImageUrl,
    List<UpdateVariantRequest> Variants,
    bool IsActive = true,
    string? Slug = null,
    string? MetaTitle = null,
    string? MetaDescription = null,
    List<UpdateProductImageRequest>? Images = null) : IRequest<bool>;
