using Catalog.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Products.GetProducts;

public class GetProductsHandler : IRequestHandler<GetProductsQuery, IEnumerable<ProductDto>>
{
    private readonly CatalogDbContext _context;

    public GetProductsHandler(CatalogDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ProductDto>> Handle(GetProductsQuery query, CancellationToken cancellationToken)
    {
        var products = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Variants.Where(v => v.IsActive))
            .Include(p => p.Images.Where(i => i.IsPrimary))
            .Where(p => p.IsActive)
            .OrderBy(p => p.Name)
            .ToListAsync(cancellationToken);

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
