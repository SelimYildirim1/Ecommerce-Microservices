using MediatR;

namespace Catalog.API.Products.GetProducts;

// 1. Dışarıya döneceğimiz veri formatı (DTO)
public record ProductDto(Guid Id, string Name, string Description, decimal Price, string PictureUrl, int StockQuantity);

// 2. İstek kalıbı (Query)
// Bu istek parametre almıyor (tümünü getir) ve geriye ProductDto listesi dönüyor.
public record GetProductsQuery() : IRequest<IEnumerable<ProductDto>>;