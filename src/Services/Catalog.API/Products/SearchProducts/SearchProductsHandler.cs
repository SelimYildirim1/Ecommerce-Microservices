using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Products.GetProducts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Products.SearchProducts;

public class SearchProductsHandler : IRequestHandler<SearchProductsQuery, PagedResult<ProductDto>>
{
    private const int MaxPageSize = 100;

    private readonly CatalogDbContext _context;

    public SearchProductsHandler(CatalogDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<ProductDto>> Handle(
        SearchProductsQuery query, CancellationToken cancellationToken)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var filtered = ProductQueryFilters.Apply(_context.Products.AsNoTracking(), query);

        var total = await filtered.CountAsync(cancellationToken);

        var ordered = ApplySort(filtered, query.Sort);

        var products = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .ToListAsync(cancellationToken);

        var ratings = await LoadRatingsAsync(
            products.Select(p => p.Id).ToList(), cancellationToken);

        var items = products
            .Select(p =>
            {
                ratings.TryGetValue(p.Id, out var stats);
                return p.ToDto(query.IncludeInactive) with
                {
                    AverageRating = stats.Count > 0 ? Math.Round(stats.Average, 2) : null,
                    ReviewCount = stats.Count
                };
            })
            .ToList();

        return new PagedResult<ProductDto>(items, total, page, pageSize);
    }

    private async Task<Dictionary<Guid, (double Average, int Count)>> LoadRatingsAsync(
        List<Guid> productIds, CancellationToken cancellationToken)
    {
        if (productIds.Count == 0) return new Dictionary<Guid, (double, int)>();

        var rows = await _context.ProductReviews
            .AsNoTracking()
            .Where(r => productIds.Contains(r.ProductId) && r.IsApproved)
            .GroupBy(r => r.ProductId)
            .Select(g => new { ProductId = g.Key, Average = g.Average(r => (double)r.Rating), Count = g.Count() })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(r => r.ProductId, r => (r.Average, r.Count));
    }

    private static IQueryable<Product> ApplySort(IQueryable<Product> source, ProductSort sort) => sort switch
    {
        ProductSort.PriceAsc => source.OrderBy(p =>
            p.Variants.Where(v => v.IsActive).Min(v => (decimal?)v.Price) ?? decimal.MaxValue),
        ProductSort.PriceDesc => source.OrderByDescending(p =>
            p.Variants.Where(v => v.IsActive).Min(v => (decimal?)v.Price) ?? 0m),
        ProductSort.NameAsc => source.OrderBy(p => p.Name),
        ProductSort.NameDesc => source.OrderByDescending(p => p.Name),
        ProductSort.Rating => source
            .OrderByDescending(p => p.Reviews.Where(r => r.IsApproved).Average(r => (double?)r.Rating) ?? 0)
            .ThenByDescending(p => p.CreatedAt),
        _ => source.OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Name)
    };
}

/// <summary>
/// Arama ve facet sorgulari ayni filtreyi kullanir; tek yerde tutulur ki
/// sayimlar listeyle tutarli kalsin.
/// </summary>
internal static class ProductQueryFilters
{
    public static IQueryable<Product> Apply(IQueryable<Product> source, SearchProductsQuery query)
    {
        if (!query.IncludeInactive)
            source = source.Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            source = source.Where(p =>
                EF.Functions.ILike(p.Name, $"%{term}%") ||
                EF.Functions.ILike(p.Description, $"%{term}%") ||
                EF.Functions.ILike(p.Category.Name, $"%{term}%") ||
                EF.Functions.ILike(p.Brand.Name, $"%{term}%"));
        }

        if (query.CategoryId.HasValue)
        {
            var categoryId = query.CategoryId.Value;
            // Alt kategoriler de dahil edilir
            source = source.Where(p =>
                p.CategoryId == categoryId || p.Category.ParentId == categoryId);
        }

        if (query.BrandId.HasValue)
            source = source.Where(p => p.BrandId == query.BrandId.Value);

        if (query.MinPrice.HasValue)
            source = source.Where(p =>
                p.Variants.Where(v => v.IsActive).Max(v => (decimal?)v.Price) >= query.MinPrice.Value);

        if (query.MaxPrice.HasValue)
            source = source.Where(p =>
                p.Variants.Where(v => v.IsActive).Min(v => (decimal?)v.Price) <= query.MaxPrice.Value);

        if (query.InStockOnly)
            source = source.Where(p => p.Variants.Any(v => v.IsActive && v.StockQuantity > 0));

        return source;
    }
}

public class GetProductFacetsHandler : IRequestHandler<GetProductFacetsQuery, ProductFacetsDto>
{
    private readonly CatalogDbContext _context;

    public GetProductFacetsHandler(CatalogDbContext context)
    {
        _context = context;
    }

    public async Task<ProductFacetsDto> Handle(
        GetProductFacetsQuery query, CancellationToken cancellationToken)
    {
        // Kategori sayimlari kategori filtresinden etkilenmemeli ki kullanici
        // baska bir kategoriye gecebilsin.
        var baseQuery = ProductQueryFilters.Apply(
            _context.Products.AsNoTracking(),
            new SearchProductsQuery(Search: query.Search));

        var categoryCounts = await CountByAsync(baseQuery, p => p.CategoryId, cancellationToken);

        var scoped = ProductQueryFilters.Apply(
            _context.Products.AsNoTracking(),
            new SearchProductsQuery(Search: query.Search, CategoryId: query.CategoryId));

        var brandCounts = await CountByAsync(scoped, p => p.BrandId, cancellationToken);

        var categoryNames = await _context.Categories
            .AsNoTracking()
            .Where(c => categoryCounts.Keys.Contains(c.Id))
            .Select(c => new { c.Id, c.Name })
            .ToListAsync(cancellationToken);

        var brandNames = await _context.Brands
            .AsNoTracking()
            .Where(b => brandCounts.Keys.Contains(b.Id))
            .Select(b => new { b.Id, b.Name })
            .ToListAsync(cancellationToken);

        var categories = categoryNames
            .Select(c => new FacetItemDto(c.Id, c.Name, categoryCounts[c.Id]))
            .OrderByDescending(f => f.Count)
            .ThenBy(f => f.Name)
            .ToList();

        var brands = brandNames
            .Select(b => new FacetItemDto(b.Id, b.Name, brandCounts[b.Id]))
            .OrderByDescending(f => f.Count)
            .ThenBy(f => f.Name)
            .ToList();

        var priceRange = await scoped
            .SelectMany(p => p.Variants.Where(v => v.IsActive))
            .GroupBy(_ => 1)
            .Select(g => new { Min = g.Min(v => v.Price), Max = g.Max(v => v.Price) })
            .FirstOrDefaultAsync(cancellationToken);

        return new ProductFacetsDto(
            categories,
            brands,
            priceRange?.Min ?? 0m,
            priceRange?.Max ?? 0m);
    }

    /// <summary>
    /// Skaler bir anahtara gore sayim. Ad alanlari ayri sorguda cozulur;
    /// navigasyon uzerinden gruplama PostgreSQL'e cevrilemiyor.
    /// </summary>
    private static async Task<Dictionary<Guid, int>> CountByAsync(
        IQueryable<Product> source,
        System.Linq.Expressions.Expression<Func<Product, Guid>> keySelector,
        CancellationToken cancellationToken)
    {
        var rows = await source
            .GroupBy(keySelector)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(r => r.Id, r => r.Count);
    }
}
