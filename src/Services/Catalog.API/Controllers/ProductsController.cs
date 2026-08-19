using Catalog.API.Data;
using Catalog.API.Products.CreateProduct;
using Catalog.API.Products.DeleteProduct;
using Catalog.API.Products.GetProducts;
using Catalog.API.Products.GetProductById;
using Catalog.API.Products.SearchProducts;
using Catalog.API.Products.UpdateProduct;
using Catalog.API.Products.UpdateVariant;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ProductsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly CatalogDbContext _context;

    public ProductsController(IMediator mediator, CatalogDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>Aynı kategori + aynı markadan karışık benzer ürünler.</summary>
    [HttpGet("{id:guid}/related")]
    public async Task<IActionResult> GetRelated(Guid id, [FromQuery] int take = 8)
    {
        take = Math.Clamp(take, 1, 24);

        var product = await _context.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product is null) return NotFound();

        var candidates = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .Include(p => p.Reviews)
            .Where(p => p.IsActive && p.Id != id &&
                        (p.CategoryId == product.CategoryId || p.BrandId == product.BrandId))
            .ToListAsync();

        var ordered = candidates
            .OrderByDescending(p => p.CategoryId == product.CategoryId && p.BrandId == product.BrandId)
            .ThenByDescending(p => p.CategoryId == product.CategoryId)
            .ThenByDescending(p => p.Reviews.Count(r => r.IsApproved))
            .ThenBy(p => p.Name)
            .Take(take)
            .Select(p =>
            {
                var dto = p.ToDto(false);
                var approved = p.Reviews.Where(r => r.IsApproved).ToList();
                return dto with
                {
                    AverageRating = approved.Count > 0 ? Math.Round(approved.Average(r => r.Rating), 2) : null,
                    ReviewCount = approved.Count
                };
            })
            .ToList();

        return Ok(ordered);
    }

    /// <summary>En çok beğenilen / yorumlanan ürünler.</summary>
    [HttpGet("bestsellers")]
    public async Task<IActionResult> GetBestsellers([FromQuery] int take = 12)
    {
        take = Math.Clamp(take, 1, 48);

        var products = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .Include(p => p.Reviews)
            .Where(p => p.IsActive)
            .ToListAsync();

        var result = products
            .Select(p =>
            {
                var approved = p.Reviews.Where(r => r.IsApproved).ToList();
                var avg = approved.Count > 0 ? approved.Average(r => r.Rating) : 0;
                var score = approved.Count * avg;
                return (Product: p, Score: score, Avg: avg, Count: approved.Count);
            })
            .OrderByDescending(x => x.Score)
            .ThenByDescending(x => x.Count)
            .Take(take)
            .Select(x => x.Product.ToDto(false) with
            {
                AverageRating = x.Count > 0 ? Math.Round(x.Avg, 2) : null,
                ReviewCount = x.Count
            })
            .ToList();

        return Ok(result);
    }

    /// <summary>CompareAtPrice &gt; Price olan indirimli ürünler.</summary>
    [HttpGet("deals")]
    public async Task<IActionResult> GetDeals([FromQuery] int take = 12)
    {
        take = Math.Clamp(take, 1, 48);

        var products = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .Include(p => p.Reviews)
            .Where(p => p.IsActive && p.Variants.Any(v =>
                v.IsActive && v.CompareAtPrice != null && v.CompareAtPrice > v.Price))
            .ToListAsync();

        var result = products
            .OrderByDescending(p =>
            {
                var v = p.Variants.Where(x => x.IsActive && x.CompareAtPrice > x.Price)
                    .OrderBy(x => x.Price)
                    .FirstOrDefault();
                if (v?.CompareAtPrice is null || v.CompareAtPrice <= 0) return 0m;
                return (v.CompareAtPrice.Value - v.Price) / v.CompareAtPrice.Value;
            })
            .Take(take)
            .Select(p =>
            {
                var approved = p.Reviews.Where(r => r.IsApproved).ToList();
                return p.ToDto(false) with
                {
                    AverageRating = approved.Count > 0 ? Math.Round(approved.Average(r => r.Rating), 2) : null,
                    ReviewCount = approved.Count
                };
            })
            .ToList();

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProductById(Guid id, [FromQuery] bool includeInactive = false)
    {
        var result = await _mediator.Send(new GetProductByIdQuery(id, includeInactive));

        if (result == null)
            return NotFound($"Ürün bulunamadı. ID: {id}");

        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] bool includeInactive = false)
    {
        var result = await _mediator.Send(new GetProductsQuery(includeInactive));
        return Ok(result);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] SearchProductsQuery query)
    {
        var result = await _mediator.Send(query);

        // Popüler aramalar için sorguyu logla (yanıtı engellemez)
        if (!string.IsNullOrWhiteSpace(query.Search) && query.Search.Trim().Length >= 2)
        {
            _ = LogSearchQueryAsync(query.Search.Trim());
        }

        return Ok(result);
    }

    /// <summary>En çok aranan sorgular (vitrin arama kutusu).</summary>
    [HttpGet("popular-searches")]
    public async Task<IActionResult> GetPopularSearches([FromQuery] int take = 8)
    {
        take = Math.Clamp(take, 1, 24);
        var items = await _context.SearchQueryLogs
            .AsNoTracking()
            .OrderByDescending(s => s.HitCount)
            .ThenByDescending(s => s.LastSearchedAt)
            .Take(take)
            .Select(s => new { s.Query, s.HitCount })
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>
    /// Header arama önerileri: eşleşen kategori, marka ve popüler sorgular.
    /// </summary>
    [HttpGet("suggest")]
    public async Task<IActionResult> Suggest([FromQuery] string? q, [FromQuery] int take = 8, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 12);
        var term = (q ?? string.Empty).Trim();
        if (term.Length < 2)
        {
            return Ok(new SearchSuggestDto([], [], []));
        }

        var like = $"%{term}%";
        var termLower = term.ToLower();

        var categories = await _context.Categories
            .AsNoTracking()
            .Where(c => EF.Functions.ILike(c.Name, like))
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Take(take)
            .Select(c => new SearchSuggestItemDto(c.Id, c.Name, c.Slug, c.ImageUrl))
            .ToListAsync(ct);

        var brands = await _context.Brands
            .AsNoTracking()
            .Where(b => EF.Functions.ILike(b.Name, like))
            .OrderBy(b => b.Name)
            .Take(take)
            .Select(b => new SearchSuggestItemDto(b.Id, b.Name, b.Slug, b.LogoUrl))
            .ToListAsync(ct);

        var queries = await _context.SearchQueryLogs
            .AsNoTracking()
            .Where(s => EF.Functions.ILike(s.Query, like) && s.Query != termLower)
            .OrderByDescending(s => s.HitCount)
            .ThenByDescending(s => s.LastSearchedAt)
            .Take(take)
            .Select(s => s.Query)
            .ToListAsync(ct);

        if (queries.Count < take)
        {
            var names = await _context.Products
                .AsNoTracking()
                .Where(p => p.IsActive && EF.Functions.ILike(p.Name, like))
                .OrderBy(p => p.Name)
                .Select(p => p.Name)
                .Take(take * 2)
                .ToListAsync(ct);

            foreach (var name in names)
            {
                if (queries.Count >= take) break;
                var trimmed = name.Trim();
                if (trimmed.Length > 48) continue;
                if (queries.Any(x => string.Equals(x, trimmed, StringComparison.OrdinalIgnoreCase))) continue;
                if (string.Equals(trimmed, term, StringComparison.OrdinalIgnoreCase)) continue;
                queries.Add(trimmed);
            }
        }

        return Ok(new SearchSuggestDto(categories, brands, queries));
    }

    private async Task LogSearchQueryAsync(string raw)
    {
        try
        {
            var normalized = raw.Trim().ToLowerInvariant();
            if (normalized.Length > 200) normalized = normalized[..200];

            var existing = await _context.SearchQueryLogs
                .FirstOrDefaultAsync(s => s.Query == normalized);

            if (existing is null)
            {
                _context.SearchQueryLogs.Add(new Entities.SearchQueryLog
                {
                    Query = normalized,
                    HitCount = 1,
                    LastSearchedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.HitCount += 1;
                existing.LastSearchedAt = DateTime.UtcNow;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }
        catch
        {
            // Arama logu kritik değil
        }
    }

    [HttpGet("facets")]
    public async Task<IActionResult> Facets([FromQuery] string? search, [FromQuery] Guid? categoryId)
    {
        var result = await _mediator.Send(new GetProductFacetsQuery(search, categoryId));
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductCommand command)
    {
        var updated = await _mediator.Send(command with { Id = id });
        if (!updated) return NotFound($"Ürün bulunamadı. ID: {id}");
        return Ok(new { id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id, [FromQuery] bool permanent = false)
    {
        var deleted = await _mediator.Send(new DeleteProductCommand(id, permanent));
        if (!deleted) return NotFound($"Ürün bulunamadı. ID: {id}");
        return NoContent();
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetProductStatusRequest request)
    {
        var updated = await _mediator.Send(new SetProductStatusCommand(id, request.IsActive));
        if (!updated) return NotFound($"Ürün bulunamadı. ID: {id}");
        return Ok(new { id, request.IsActive });
    }

    [HttpPut("{id:guid}/variants/{variantId:guid}")]
    public async Task<IActionResult> UpdateVariant(
        Guid id, Guid variantId, [FromBody] UpdateVariantRequestBody request)
    {
        var updated = await _mediator.Send(new UpdateVariantCommand(
            id, variantId, request.Price, request.StockQuantity, request.IsActive));

        if (!updated) return NotFound("Varyant bulunamadı.");
        return Ok(new { id, variantId });
    }
}

public record SetProductStatusRequest(bool IsActive);

public record UpdateVariantRequestBody(decimal? Price, int? StockQuantity, bool? IsActive);

public record SearchSuggestItemDto(Guid Id, string Name, string? Slug, string? ImageUrl);

public record SearchSuggestDto(
    IReadOnlyList<SearchSuggestItemDto> Categories,
    IReadOnlyList<SearchSuggestItemDto> Brands,
    IReadOnlyList<string> Queries);
