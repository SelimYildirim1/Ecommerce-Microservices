using System.Text.Json;
using Catalog.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Categories.GetCategoryFilters;

public class GetCategoryFiltersHandler : IRequestHandler<GetCategoryFiltersQuery, CategoryFiltersDto?>
{
    private readonly CatalogDbContext _context;

    public GetCategoryFiltersHandler(CatalogDbContext context)
    {
        _context = context;
    }

    public async Task<CategoryFiltersDto?> Handle(GetCategoryFiltersQuery query, CancellationToken ct)
    {
        // 1. Kategoriyi ve filtrelenebilir özelliklerini getir
        var category = await _context.Categories
            .AsNoTracking()
            .Include(c => c.CategoryAttributes.Where(ca => ca.IsFilterable))
                .ThenInclude(ca => ca.ProductAttribute)
            .FirstOrDefaultAsync(c => c.Id == query.CategoryId, ct);

        if (category is null) return null;

        var filterableAttrs = category.CategoryAttributes
            .OrderBy(ca => ca.SortOrder)
            .ToList();

        if (filterableAttrs.Count == 0)
        {
            return new CategoryFiltersDto(category.Id, category.Name, new List<FilterAttributeDto>());
        }

        // 2. Bu kategorideki aktif ürünlerin varyantlarından Specifics değerlerini çek
        var specificsJsonList = await _context.ProductVariants
            .AsNoTracking()
            .Where(v => v.Product.CategoryId == query.CategoryId
                     && v.Product.IsActive
                     && v.IsActive
                     && v.Specifics != null)
            .Select(v => v.Specifics!)
            .ToListAsync(ct);

        // 3. Her filtrelenebilir özellik için mevcut değerleri topla
        var filters = new List<FilterAttributeDto>();

        foreach (var ca in filterableAttrs)
        {
            var attr = ca.ProductAttribute;
            var values = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var doc in specificsJsonList)
            {
                if (doc.RootElement.TryGetProperty(attr.Code, out var prop))
                {
                    var val = prop.GetString();
                    if (!string.IsNullOrWhiteSpace(val))
                        values.Add(val);
                }
            }

            var options = string.IsNullOrWhiteSpace(attr.Options)
                ? null
                : attr.Options.Split(',', StringSplitOptions.TrimEntries).ToList();

            filters.Add(new FilterAttributeDto(
                attr.Id,
                attr.Name,
                attr.Code,
                attr.DataType,
                options,
                values.OrderBy(v => v).ToList()));
        }

        return new CategoryFiltersDto(category.Id, category.Name, filters);
    }
}
