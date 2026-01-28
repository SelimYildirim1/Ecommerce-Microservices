using MediatR;
using Catalog.API.Products.GetProducts; // ProductDto'yu kullanmak için

namespace Catalog.API.Products.GetProductById;

// ID'ye göre tek ürün getiren Query
public record GetProductByIdQuery(Guid Id) : IRequest<ProductDto?>;
