using MediatR;
using Catalog.API.Products.GetProducts;

namespace Catalog.API.Products.GetProductById;

public record GetProductByIdQuery(Guid Id, bool IncludeInactive = false) : IRequest<ProductDto?>;
