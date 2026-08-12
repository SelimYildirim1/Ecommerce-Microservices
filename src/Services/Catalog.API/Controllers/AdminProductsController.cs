using System.Globalization;
using System.Text;
using System.Text.Json;
using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Products;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

public record BulkProductsRequest(
    string Action,
    List<Guid> ProductIds,
    Guid? CategoryId = null);

public class ProductCsvRow
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string CategoryName { get; set; } = "";
    public string BrandName { get; set; } = "";
    public string Sku { get; set; } = "";
    public decimal Price { get; set; }
    public decimal? CompareAtPrice { get; set; }
    public int StockQuantity { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Slug { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? SpecificsJson { get; set; }
}

/// <summary>Panel: toplu ürün işlemleri, CSV import/export, çoğaltma.</summary>
[Route("api/admin/products")]
[ApiController]
public class AdminProductsController : ControllerBase
{
    private readonly CatalogDbContext _context;
    private readonly ILogger<AdminProductsController> _logger;

    public AdminProductsController(CatalogDbContext context, ILogger<AdminProductsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Toplu işlem: activate | deactivate | delete | changeCategory.
    /// delete soft-delete (IsActive=false) uygular.
    /// </summary>
    [HttpPost("bulk")]
    public async Task<IActionResult> Bulk([FromBody] BulkProductsRequest request)
    {
        if (request.ProductIds is null || request.ProductIds.Count == 0)
            return BadRequest("En az bir ürün seçilmelidir.");

        var action = (request.Action ?? "").Trim().ToLowerInvariant();
        var products = await _context.Products
            .Where(p => request.ProductIds.Contains(p.Id))
            .ToListAsync();

        if (products.Count == 0)
            return NotFound("Ürün bulunamadı.");

        switch (action)
        {
            case "activate":
                foreach (var p in products)
                {
                    p.IsActive = true;
                    p.UpdatedAt = DateTime.UtcNow;
                }
                break;

            case "deactivate":
            case "delete":
                foreach (var p in products)
                {
                    p.IsActive = false;
                    p.UpdatedAt = DateTime.UtcNow;
                }
                break;

            case "changecategory":
                if (!request.CategoryId.HasValue)
                    return BadRequest("Kategori değişimi için CategoryId zorunludur.");
                if (!await _context.Categories.AnyAsync(c => c.Id == request.CategoryId.Value))
                    return BadRequest("Kategori bulunamadı.");
                foreach (var p in products)
                {
                    p.CategoryId = request.CategoryId.Value;
                    p.UpdatedAt = DateTime.UtcNow;
                }
                break;

            default:
                return BadRequest("Geçersiz action. Kullanım: activate, deactivate, delete, changeCategory.");
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Bulk {Action} applied to {Count} products", action, products.Count);
        return Ok(new { count = products.Count, action });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var products = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .Include(p => p.Variants)
            .OrderBy(p => p.Name)
            .ToListAsync();

        var rows = products
            .SelectMany(p => p.Variants.Select(v => new ProductCsvRow
            {
                Name = p.Name,
                Description = p.Description,
                CategoryName = p.Category?.Name ?? "",
                BrandName = p.Brand?.Name ?? "",
                Sku = v.Sku,
                Price = v.Price,
                CompareAtPrice = v.CompareAtPrice,
                StockQuantity = v.StockQuantity,
                IsActive = p.IsActive,
                Slug = p.Slug,
                MetaTitle = p.MetaTitle,
                MetaDescription = p.MetaDescription,
                SpecificsJson = v.Specifics?.RootElement.GetRawText()
            }))
            .ToList();

        await using var ms = new MemoryStream();
        await using (var writer = new StreamWriter(ms, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true), leaveOpen: true))
        await using (var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true
        }))
        {
            await csv.WriteRecordsAsync(rows);
        }

        return File(ms.ToArray(), "text/csv", $"products-{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }

    [HttpPost("import")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> Import(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest("CSV dosyası gerekli.");

        var errors = new List<object>();
        var created = 0;
        var updated = 0;
        var skipped = 0;
        var rowNumber = 1;

        await using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream, Encoding.UTF8);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            MissingFieldFound = null,
            HeaderValidated = null,
            TrimOptions = TrimOptions.Trim
        });

        var categories = await _context.Categories.ToListAsync();
        var brands = await _context.Brands.ToListAsync();
        var categoryByName = categories.ToDictionary(c => c.Name, c => c, StringComparer.OrdinalIgnoreCase);
        var brandByName = brands.ToDictionary(b => b.Name, b => b, StringComparer.OrdinalIgnoreCase);

        var records = csv.GetRecords<ProductCsvRow>();
        foreach (var row in records)
        {
            rowNumber++;
            try
            {
                if (string.IsNullOrWhiteSpace(row.Name))
                {
                    errors.Add(new { row = rowNumber, message = "Name zorunlu." });
                    skipped++;
                    continue;
                }

                if (string.IsNullOrWhiteSpace(row.Sku))
                {
                    errors.Add(new { row = rowNumber, message = "Sku zorunlu." });
                    skipped++;
                    continue;
                }

                if (string.IsNullOrWhiteSpace(row.CategoryName) ||
                    !categoryByName.TryGetValue(row.CategoryName.Trim(), out var category))
                {
                    errors.Add(new { row = rowNumber, message = $"Kategori bulunamadı: {row.CategoryName}" });
                    skipped++;
                    continue;
                }

                if (string.IsNullOrWhiteSpace(row.BrandName) ||
                    !brandByName.TryGetValue(row.BrandName.Trim(), out var brand))
                {
                    errors.Add(new { row = rowNumber, message = $"Marka bulunamadı: {row.BrandName}" });
                    skipped++;
                    continue;
                }

                if (row.Price < 0 || row.StockQuantity < 0)
                {
                    errors.Add(new { row = rowNumber, message = "Price ve StockQuantity negatif olamaz." });
                    skipped++;
                    continue;
                }

                JsonDocument? specifics = null;
                if (!string.IsNullOrWhiteSpace(row.SpecificsJson))
                {
                    try
                    {
                        specifics = JsonDocument.Parse(row.SpecificsJson);
                    }
                    catch
                    {
                        errors.Add(new { row = rowNumber, message = "SpecificsJson geçersiz JSON." });
                        skipped++;
                        continue;
                    }
                }

                var existingVariant = await _context.ProductVariants
                    .Include(v => v.Product)
                    .FirstOrDefaultAsync(v => v.Sku == row.Sku.Trim());

                if (existingVariant is not null)
                {
                    existingVariant.Price = row.Price;
                    existingVariant.CompareAtPrice = row.CompareAtPrice;
                    existingVariant.StockQuantity = row.StockQuantity;
                    existingVariant.Specifics = specifics;
                    existingVariant.UpdatedAt = DateTime.UtcNow;

                    var product = existingVariant.Product;
                    product.Name = row.Name.Trim();
                    product.Description = row.Description ?? "";
                    product.CategoryId = category.Id;
                    product.BrandId = brand.Id;
                    product.IsActive = row.IsActive;
                    product.MetaTitle = row.MetaTitle;
                    product.MetaDescription = row.MetaDescription;
                    if (!string.IsNullOrWhiteSpace(row.Slug))
                        product.Slug = SlugGenerator.Generate(row.Slug);
                    product.UpdatedAt = DateTime.UtcNow;
                    updated++;
                }
                else
                {
                    var product = new Product
                    {
                        Name = row.Name.Trim(),
                        Description = row.Description ?? "",
                        CategoryId = category.Id,
                        BrandId = brand.Id,
                        IsActive = row.IsActive,
                        MetaTitle = row.MetaTitle,
                        MetaDescription = row.MetaDescription,
                        Slug = SlugGenerator.Generate(
                            string.IsNullOrWhiteSpace(row.Slug) ? row.Name : row.Slug!)
                    };

                    product.Variants.Add(new ProductVariant
                    {
                        ProductId = product.Id,
                        Sku = row.Sku.Trim(),
                        Price = row.Price,
                        CompareAtPrice = row.CompareAtPrice,
                        StockQuantity = row.StockQuantity,
                        Specifics = specifics,
                        IsActive = true
                    });

                    _context.Products.Add(product);
                    created++;
                }
            }
            catch (Exception ex)
            {
                errors.Add(new { row = rowNumber, message = ex.Message });
                skipped++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            created,
            updated,
            skipped,
            errorCount = errors.Count,
            errors
        });
    }

    [HttpPost("{id:guid}/duplicate")]
    public async Task<IActionResult> Duplicate(Guid id)
    {
        var source = await _context.Products
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (source is null) return NotFound();

        var suffix = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        var copyName = $"{source.Name} (kopya)";
        var baseSlug = SlugGenerator.Generate(copyName);
        var slug = await EnsureUniqueSlugAsync(baseSlug);

        var clone = new Product
        {
            Name = copyName,
            Description = source.Description,
            CategoryId = source.CategoryId,
            BrandId = source.BrandId,
            IsActive = false,
            MetaTitle = source.MetaTitle,
            MetaDescription = source.MetaDescription,
            Slug = slug
        };

        foreach (var img in source.Images.OrderBy(i => i.SortOrder))
        {
            clone.Images.Add(new ProductImage
            {
                ProductId = clone.Id,
                Url = img.Url,
                IsPrimary = img.IsPrimary,
                SortOrder = img.SortOrder,
                MediaType = img.MediaType
            });
        }

        foreach (var v in source.Variants)
        {
            var newSku = await EnsureUniqueSkuAsync($"{v.Sku}-COPY-{suffix}");
            JsonDocument? specifics = null;
            if (v.Specifics is not null)
                specifics = JsonDocument.Parse(v.Specifics.RootElement.GetRawText());

            clone.Variants.Add(new ProductVariant
            {
                ProductId = clone.Id,
                Sku = newSku,
                Price = v.Price,
                CompareAtPrice = v.CompareAtPrice,
                StockQuantity = 0,
                Specifics = specifics,
                IsActive = v.IsActive
            });
        }

        _context.Products.Add(clone);
        await _context.SaveChangesAsync();

        return Ok(new { id = clone.Id, name = clone.Name, slug = clone.Slug });
    }

    private async Task<string> EnsureUniqueSlugAsync(string baseSlug)
    {
        var slug = baseSlug;
        var i = 1;
        while (await _context.Products.AnyAsync(p => p.Slug == slug))
        {
            slug = $"{baseSlug}-{i++}";
        }
        return slug;
    }

    private async Task<string> EnsureUniqueSkuAsync(string baseSku)
    {
        var sku = baseSku;
        var i = 1;
        while (await _context.ProductVariants.AnyAsync(v => v.Sku == sku))
        {
            sku = $"{baseSku}-{i++}";
        }
        return sku;
    }
}
