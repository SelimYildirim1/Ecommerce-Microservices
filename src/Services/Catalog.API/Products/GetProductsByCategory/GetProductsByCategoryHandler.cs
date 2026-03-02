using Catalog.API.Data;
using Catalog.API.Products.GetProducts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Products.GetProductsByCategory;

public class GetProductsByCategoryHandler : IRequestHandler<GetProductsByCategoryQuery, IEnumerable<ProductDto>>
{
    private readonly CatalogDbContext _context;

    public GetProductsByCategoryHandler(CatalogDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ProductDto>> Handle(GetProductsByCategoryQuery query, CancellationToken ct)
    {
        var productsQuery = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Variants.Where(v => v.IsActive))
            .Include(p => p.Images.Where(i => i.IsPrimary))
            .Where(p => p.IsActive && p.CategoryId == query.CategoryId);

        // JSONB filtreleme: Specifics içinden dinamik key-value eşleşmesi
        if (query.Filters is { Count: > 0 })
        {
            foreach (var filter in query.Filters)
            {
                // Closure capture için local değişken
                var key = filter.Key;
                var value = filter.Value;

                // Npgsql JSONB desteği: RootElement üzerinden property erişimi
                // Bu, PostgreSQL tarafında "Specifics" ->> 'key' = 'value' sorgusuna dönüşür
                productsQuery = productsQuery.Where(p =>
                    p.Variants.Any(v =>
                        v.IsActive
                        && v.Specifics != null
                        && v.Specifics.RootElement.GetProperty(key).GetString() == value));
            }
        }

        var products = await productsQuery
            .OrderBy(p => p.Name)
            .ToListAsync(ct);

        return products.Select(p => new ProductDto(
            p.Id,
            p.Name,
            p.Description,
            p.Category.Name,
            p.Brand.Name,
            p.Images.FirstOrDefault()?.Url,
            p.IsActive,
            p.Variants.Where(v => v.IsActive).Select(v => v.Price).FirstOrDefault(),
            p.Variants.Where(v => v.IsActive).Sum(v => v.StockQuantity),
            p.Variants.Select(v => new VariantDto(
                v.Id, v.Sku, v.Price, v.StockQuantity, v.Specifics, v.IsActive
            )).ToList()
        ));
    }
}
