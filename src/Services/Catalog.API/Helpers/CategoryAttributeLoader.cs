using Catalog.API.Data;
using Catalog.API.Products.GetProducts;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Helpers;

/// <summary>
/// Ürünün kategorisi ve üst zincirinden özellik tanımlarını (ad, kod, varyant mı) yükler.
/// </summary>
public static class CategoryAttributeLoader
{
    public static async Task<List<ProductAttributeInfoDto>> LoadAsync(
        CatalogDbContext context,
        Guid? categoryId,
        CancellationToken cancellationToken)
    {
        if (categoryId is null) return [];

        var chainIds = new List<Guid>();
        Guid? cursor = categoryId;
        while (cursor is not null && chainIds.Count < 16)
        {
            var id = cursor.Value;
            chainIds.Add(id);
            cursor = await context.Categories
                .AsNoTracking()
                .Where(c => c.Id == id)
                .Select(c => c.ParentId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        var rows = await context.CategoryAttributes
            .AsNoTracking()
            .Include(ca => ca.ProductAttribute)
            .Where(ca => chainIds.Contains(ca.CategoryId))
            .ToListAsync(cancellationToken);

        var byCategory = rows
            .GroupBy(ca => ca.CategoryId)
            .ToDictionary(g => g.Key, g => g.OrderBy(ca => ca.SortOrder).ToList());

        var result = new List<ProductAttributeInfoDto>();
        var seen = new HashSet<Guid>();

        for (var depth = 0; depth < chainIds.Count; depth++)
        {
            if (!byCategory.TryGetValue(chainIds[depth], out var list)) continue;

            foreach (var ca in list)
            {
                if (!seen.Add(ca.ProductAttributeId)) continue;
                var pa = ca.ProductAttribute;
                result.Add(new ProductAttributeInfoDto(
                    pa.Code,
                    pa.Name,
                    pa.IsVariant,
                    pa.Options,
                    depth * 100 + ca.SortOrder));
            }
        }

        return result;
    }
}
