using Catalog.API.Products.GetProducts;
using MediatR;

namespace Catalog.API.Products.SearchProducts;

/// <summary>Vitrin listeleme sirasi.</summary>
public enum ProductSort
{
    Newest = 0,
    PriceAsc = 1,
    PriceDesc = 2,
    NameAsc = 3,
    NameDesc = 4,
    Rating = 5
}

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Total,
    int Page,
    int PageSize)
{
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(Total / (double)PageSize) : 0;
}

/// <summary>Vitrin filtreleri. Tum alanlar opsiyoneldir.</summary>
public record SearchProductsQuery(
    string? Search = null,
    Guid? CategoryId = null,
    Guid? BrandId = null,
    decimal? MinPrice = null,
    decimal? MaxPrice = null,
    bool InStockOnly = false,
    ProductSort Sort = ProductSort.Newest,
    int Page = 1,
    int PageSize = 24,
    bool IncludeInactive = false) : IRequest<PagedResult<ProductDto>>;

/// <summary>Filtre panelinde gosterilecek secenekler ve sayilari.</summary>
public record ProductFacetsDto(
    List<FacetItemDto> Categories,
    List<FacetItemDto> Brands,
    decimal MinPrice,
    decimal MaxPrice);

public record FacetItemDto(Guid Id, string Name, int Count);

public record GetProductFacetsQuery(
    string? Search = null,
    Guid? CategoryId = null) : IRequest<ProductFacetsDto>;
