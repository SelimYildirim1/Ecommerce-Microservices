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
    int ReviewCount = 0,
    List<ProductAttributeInfoDto>? Attributes = null);

/// <summary>Kategori özelliği: vitrinde Türkçe ad ve varyant seçimi için.</summary>
public record ProductAttributeInfoDto(
    string Code,
    string Name,
    bool IsVariant,
    string? Options,
    int SortOrder);

public record ProductImageDto(
    Guid Id,
    string Url,
    bool IsPrimary,
    int SortOrder,
    string MediaType = "image");

public record VariantDto(
    Guid Id,
    string Sku,
    decimal Price,
    int StockQuantity,
    JsonDocument? Specifics,
    bool IsActive,
    decimal? CompareAtPrice = null);

// Query - admin tarafi pasif urunleri de gormek icin includeInactive kullanir
public record GetProductsQuery(bool IncludeInactive = false) : IRequest<IEnumerable<ProductDto>>;
