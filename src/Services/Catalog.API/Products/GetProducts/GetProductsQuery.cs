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
    List<VariantDto> Variants,
    Guid? CategoryId = null,
    Guid? BrandId = null,
    string? Slug = null,
    string? MetaTitle = null,
    string? MetaDescription = null,
    List<ProductImageDto>? Images = null,
    double? AverageRating = null,
    int ReviewCount = 0);

public record VariantDto(
    Guid Id,
    string Sku,
    decimal Price,
    int StockQuantity,
    JsonDocument? Specifics,
    bool IsActive);

public record ProductImageDto(
    Guid Id,
    string Url,
    bool IsPrimary,
    int SortOrder);

// Query - admin tarafi pasif urunleri de gormek icin includeInactive kullanir
public record GetProductsQuery(bool IncludeInactive = false) : IRequest<IEnumerable<ProductDto>>;
