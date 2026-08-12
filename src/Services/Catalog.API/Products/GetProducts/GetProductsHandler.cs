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
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .Where(p => query.IncludeInactive || p.IsActive)
            .OrderBy(p => p.Name)
            .ToListAsync(cancellationToken);

        return products.Select(p => p.ToDto(query.IncludeInactive));
    }
}

internal static class ProductMappingExtensions
{
    /// <summary>
    /// Vitrin tarafi yalnizca aktif varyantlari gorur; admin tarafi (includeInactive)
    /// pasifleri de gormeli ki duzenleyebilsin.
    /// </summary>
    public static ProductDto ToDto(this Entities.Product p, bool includeInactive)
    {
        var variants = includeInactive
            ? p.Variants.ToList()
            : p.Variants.Where(v => v.IsActive).ToList();

        var activeVariants = p.Variants.Where(v => v.IsActive).ToList();

        return new ProductDto(
            p.Id,
            p.Name,
            p.Description,
            p.Category?.Name ?? string.Empty,
            p.Brand?.Name ?? string.Empty,
            p.Images.FirstOrDefault(i => i.IsPrimary)?.Url ?? p.Images.FirstOrDefault()?.Url,
            p.IsActive,
            activeVariants.Select(v => v.Price).FirstOrDefault(),
            activeVariants.Sum(v => v.StockQuantity),
            variants
                .Select(v => new VariantDto(v.Id, v.Sku, v.Price, v.StockQuantity, v.Specifics, v.IsActive, v.CompareAtPrice))
                .ToList(),
            p.CategoryId,
            p.BrandId,
            p.Slug,
            p.MetaTitle,
            p.MetaDescription,
            p.Images
                .OrderBy(i => i.SortOrder)
                .Select(i => new ProductImageDto(i.Id, i.Url, i.IsPrimary, i.SortOrder, i.MediaType ?? "image"))
                .ToList());
    }
}
