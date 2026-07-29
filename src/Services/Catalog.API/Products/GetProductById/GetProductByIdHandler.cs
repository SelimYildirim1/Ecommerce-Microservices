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
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == query.Id, cancellationToken);

        if (product == null) return null;

        var ratings = await _context.ProductReviews
            .AsNoTracking()
            .Where(r => r.ProductId == product.Id && r.IsApproved)
            .Select(r => (double)r.Rating)
            .ToListAsync(cancellationToken);

        return product.ToDto(query.IncludeInactive) with
        {
            AverageRating = ratings.Count > 0 ? Math.Round(ratings.Average(), 2) : null,
            ReviewCount = ratings.Count
        };
    }
}
