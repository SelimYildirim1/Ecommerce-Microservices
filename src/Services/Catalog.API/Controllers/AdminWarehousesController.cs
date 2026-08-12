using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

public record WarehouseRequest(
    string Name,
    string? Code,
    string? Address,
    bool IsActive = true,
    bool IsDefault = false);

public record WarehouseStockAdjustRequest(
    Guid VariantId,
    int Quantity,
    StockMovementType Type,
    string? Note,
    string? Reference);

/// <summary>Panel: depo CRUD ve depo bazlı stok düzeltme.</summary>
[Route("api/admin/warehouses")]
[ApiController]
public class AdminWarehousesController : ControllerBase
{
    private readonly CatalogDbContext _context;
    private readonly StockLedger _ledger;
    private readonly ILogger<AdminWarehousesController> _logger;

    public AdminWarehousesController(
        CatalogDbContext context,
        StockLedger ledger,
        ILogger<AdminWarehousesController> logger)
    {
        _context = context;
        _ledger = ledger;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await _context.Warehouses
            .AsNoTracking()
            .OrderByDescending(w => w.IsDefault)
            .ThenBy(w => w.Name)
            .Select(w => new
            {
                w.Id,
                w.Name,
                w.Code,
                w.Address,
                w.IsActive,
                w.IsDefault,
                w.CreatedAt,
                w.UpdatedAt,
                stockLines = w.Stocks.Count,
                totalUnits = w.Stocks.Sum(s => s.Quantity)
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == id);
        if (warehouse is null) return NotFound();
        return Ok(warehouse);
    }

    [HttpGet("{id:guid}/stock")]
    public async Task<IActionResult> GetStock(Guid id)
    {
        if (!await _context.Warehouses.AnyAsync(w => w.Id == id))
            return NotFound();

        var lines = await _context.ProductVariantStocks
            .AsNoTracking()
            .Include(s => s.ProductVariant).ThenInclude(v => v.Product)
            .Where(s => s.WarehouseId == id)
            .OrderBy(s => s.ProductVariant.Sku)
            .Select(s => new
            {
                s.Id,
                s.ProductVariantId,
                sku = s.ProductVariant.Sku,
                productId = s.ProductVariant.ProductId,
                productName = s.ProductVariant.Product != null ? s.ProductVariant.Product.Name : "",
                s.Quantity,
                s.UpdatedAt
            })
            .ToListAsync();

        return Ok(lines);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] WarehouseRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Depo adı zorunludur.");

        var code = string.IsNullOrWhiteSpace(req.Code) ? null : req.Code.Trim().ToUpperInvariant();
        if (code is not null && await _context.Warehouses.AnyAsync(w => w.Code == code))
            return BadRequest("Bu depo kodu zaten kayıtlı.");

        if (req.IsDefault)
            await ClearDefaultAsync();

        var warehouse = new Warehouse
        {
            Name = req.Name.Trim(),
            Code = code,
            Address = string.IsNullOrWhiteSpace(req.Address) ? null : req.Address.Trim(),
            IsActive = req.IsActive,
            IsDefault = req.IsDefault
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();
        return Ok(warehouse);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] WarehouseRequest req)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse is null) return NotFound();

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Depo adı zorunludur.");

        var code = string.IsNullOrWhiteSpace(req.Code) ? null : req.Code.Trim().ToUpperInvariant();
        if (code is not null && await _context.Warehouses.AnyAsync(w => w.Code == code && w.Id != id))
            return BadRequest("Bu depo kodu zaten kayıtlı.");

        if (req.IsDefault && !warehouse.IsDefault)
            await ClearDefaultAsync();

        if (!req.IsDefault && warehouse.IsDefault)
            return BadRequest("Varsayılan depo kaldırılamaz. Önce başka birini varsayılan yapın.");

        warehouse.Name = req.Name.Trim();
        warehouse.Code = code;
        warehouse.Address = string.IsNullOrWhiteSpace(req.Address) ? null : req.Address.Trim();
        warehouse.IsActive = req.IsActive;
        warehouse.IsDefault = req.IsDefault;
        warehouse.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(warehouse);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var warehouse = await _context.Warehouses
            .Include(w => w.Stocks)
            .FirstOrDefaultAsync(w => w.Id == id);
        if (warehouse is null) return NotFound();
        if (warehouse.IsDefault)
            return BadRequest("Varsayılan depo silinemez.");
        if (warehouse.Stocks.Any(s => s.Quantity > 0))
            return BadRequest("Stoku olan depo silinemez. Önce stokları taşıyın veya sıfırlayın.");

        _context.ProductVariantStocks.RemoveRange(warehouse.Stocks);
        _context.Warehouses.Remove(warehouse);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Depo bazlı stok düzeltme. Varyantın toplam StockQuantity alanı depo stoklarının toplamına eşitlenir.
    /// </summary>
    [HttpPost("{id:guid}/stock/adjust")]
    public async Task<IActionResult> AdjustStock(Guid id, [FromBody] WarehouseStockAdjustRequest request)
    {
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == id);
        if (warehouse is null) return NotFound("Depo bulunamadı.");
        if (!warehouse.IsActive)
            return BadRequest("Pasif depoda stok hareketi yapılamaz.");

        var variant = await _context.ProductVariants
            .Include(v => v.Product)
            .FirstOrDefaultAsync(v => v.Id == request.VariantId);
        if (variant is null) return NotFound("Varyant bulunamadı.");

        var stock = await _context.ProductVariantStocks
            .FirstOrDefaultAsync(s => s.WarehouseId == id && s.ProductVariantId == request.VariantId);

        if (stock is null)
        {
            stock = new ProductVariantStock
            {
                WarehouseId = id,
                ProductVariantId = request.VariantId,
                Quantity = 0
            };
            _context.ProductVariantStocks.Add(stock);
        }

        var previousWh = stock.Quantity;
        var delta = request.Type switch
        {
            StockMovementType.Adjustment => request.Quantity - previousWh,
            StockMovementType.Out => -Math.Abs(request.Quantity),
            _ => Math.Abs(request.Quantity)
        };

        if (delta == 0)
            return BadRequest("Stokta değişiklik oluşmuyor.");

        if (previousWh + delta < 0)
            return BadRequest($"Depo stoku negatife düşemez. Mevcut: {previousWh}, istenen değişim: {delta}");

        stock.Quantity = previousWh + delta;
        stock.UpdatedAt = DateTime.UtcNow;

        var previousTotal = variant.StockQuantity;
        var otherWarehouses = await _context.ProductVariantStocks
            .Where(s => s.ProductVariantId == request.VariantId && s.Id != stock.Id)
            .SumAsync(s => (int?)s.Quantity) ?? 0;
        var newTotal = otherWarehouses + stock.Quantity;

        variant.StockQuantity = newTotal;
        variant.UpdatedAt = DateTime.UtcNow;

        var movement = _ledger.Record(
            variant,
            request.Type,
            newTotal - previousTotal,
            previousTotal,
            request.Reference ?? $"WH:{warehouse.Code ?? warehouse.Id.ToString("N")[..8]}",
            request.Note ?? $"Depo: {warehouse.Name}",
            createdBy: User.Identity?.Name ?? "admin");

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Depo stok: {Warehouse} {Sku} {PrevWh}->{NewWh} (toplam {PrevTotal}->{NewTotal})",
            warehouse.Name, variant.Sku, previousWh, stock.Quantity, previousTotal, newTotal);

        return Ok(new
        {
            warehouseId = id,
            variantId = variant.Id,
            sku = variant.Sku,
            warehouseQuantity = stock.Quantity,
            previousWarehouseQuantity = previousWh,
            totalStock = newTotal,
            previousTotalStock = previousTotal,
            movementId = movement.Id
        });
    }

    private async Task ClearDefaultAsync()
    {
        var defaults = await _context.Warehouses.Where(w => w.IsDefault).ToListAsync();
        foreach (var item in defaults)
        {
            item.IsDefault = false;
            item.UpdatedAt = DateTime.UtcNow;
        }
    }
}
