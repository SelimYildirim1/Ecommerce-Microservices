using MediatR;

namespace Catalog.API.Products.CreateProduct;

// Bu sınıf, Postman'den gelecek JSON verisidir.
// IRequest<Guid> demek: "Bu emri yerine getirince bana yeni ürünün ID'sini (Guid) dön" demektir.
public record CreateProductCommand(string Name, string Description, decimal Price, string PictureUrl, int StockQuantity)
    : IRequest<Guid>;