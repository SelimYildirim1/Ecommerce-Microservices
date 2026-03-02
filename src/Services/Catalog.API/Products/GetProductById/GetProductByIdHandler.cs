using Catalog.API.Data;
using Catalog.API.Products.GetProducts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Products.GetProductById;

public class GetProductByIdHandler : IRequestHandler<GetProductByIdQuery, ProductDto?>
{
    private readonly CatalogDbContext _context;

    public GetProductByIdHandler(CatalogDbContext context)
    {
        _context = context;
    }

    public async Task<ProductDto?> Handle(GetProductByIdQuery query, CancellationToken cancellationToken)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Variants.Where(v => v.IsActive))
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == query.Id, cancellationToken);

        if (product == null) return null;

        return new ProductDto(
            product.Id,
            product.Name,
            product.Description,
            product.Category.Name,
            product.Brand.Name,
            product.Images.FirstOrDefault(i => i.IsPrimary)?.Url,
            product.IsActive,
            product.Variants.Where(v => v.IsActive).Select(v => v.Price).FirstOrDefault(),
            product.Variants.Where(v => v.IsActive).Sum(v => v.StockQuantity),
            product.Variants.Select(v => new VariantDto(
                v.Id, v.Sku, v.Price, v.StockQuantity, v.Specifics, v.IsActive
            )).ToList()
        );
    }
}
