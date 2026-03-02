using System.Text.Json;
using Catalog.API.Products.GetProducts;
using MediatR;

namespace Catalog.API.Products.GetProductsByCategory;

/// <summary>
/// Kategoriye göre ürünleri getirir. JSONB Specifics üzerinden dinamik filtreleme destekler.
/// Filtreler Dictionary olarak gelir: { "ram": "16GB", "color": "Siyah" }
/// </summary>
public record GetProductsByCategoryQuery(
    Guid CategoryId,
    Dictionary<string, string>? Filters = null) : IRequest<IEnumerable<ProductDto>>;
