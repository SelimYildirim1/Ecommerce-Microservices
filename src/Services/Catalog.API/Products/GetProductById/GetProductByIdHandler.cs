using Catalog.API.Data;
using Catalog.API.Products.GetProducts; // ProductDto'yu kullanmak için
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
        // ID'ye göre ürünü bul (AsNoTracking ile performans için)
        var product = await _context.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == query.Id, cancellationToken);

        // Ürün bulunamazsa null dön
        if (product == null)
        {
            return null;
        }

        // Entity -> DTO Dönüşümü
        return new ProductDto(
            product.Id,
            product.Name,
            product.Description,
            product.Price,
            product.PictureUrl,
            product.StockQuantity);
    }
}
