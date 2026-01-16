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
        // PERFORMANS TAKTİĞİ: .AsNoTracking()
        // Okuma yaparken EF Core'a "bunu takip etme, değişiklik yapmayacağım" deriz.
        // Bu sayede sorgu çok daha hızlı çalışır ve RAM tüketimi azalır.
        
        var products = await _context.Products
            .AsNoTracking() 
            .OrderBy(p => p.Name) // İsme göre sırala
            .ToListAsync(cancellationToken);

        // Entity -> DTO Dönüşümü (Mapping)
        // İleride burayı Mapster kütüphanesiyle otomatikleştireceğiz.
        var productDtos = products.Select(p => new ProductDto(
            p.Id, 
            p.Name, 
            p.Description, 
            p.Price, 
            p.PictureUrl, 
            p.StockQuantity));

        return productDtos;
    }
}