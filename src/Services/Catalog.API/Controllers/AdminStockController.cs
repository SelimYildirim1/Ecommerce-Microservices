using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

public record StockAdjustRequest(
    Guid VariantId,
    int Quantity,
    StockMovementType Type,
    string? Note,
    string? Reference);

public record StockMovementDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    Guid VariantId,
    string Sku,
    StockMovementType Type,
    string TypeName,
    int Quantity,
    int PreviousStock,
    int NewStock,
    string? Reference,
    string? Note,
    string CreatedBy,
    DateTime CreatedAt);

public record StockSummaryDto(
    int TotalVariants,
    int OutOfStockCount,
    int LowStockCount,
    int TotalUnits,
    decimal StockValue,
    List<StockLineDto> Lines);

public record StockLineDto(
    Guid ProductId,
    string ProductName,
    Guid VariantId,
    string Sku,
    decimal Price,
    int StockQuantity,
    bool IsActive);

/// <summary>Panel stok yonetimi: hareket gecmisi ve manuel duzeltme.</summary>
[Route("api/admin/stock")]
[ApiController]
public class AdminStockController : ControllerBase
{
    /// <summary>Bu esigin altindaki stok "kritik" sayilir.</summary>
    private const int LowStockThreshold = 10;

    private static readonly Dictionary<StockMovementType, string> TypeNames = new()
    {
        [StockMovementType.In] = "Giriş",
        [StockMovementType.Out] = "Çıkış",
        [StockMovementType.Sale] = "Satış",
        [StockMovementType.Return] = "İade",
        [StockMovementType.Adjustment] = "Düzeltme"
    };

    private readonly CatalogDbContext _context;
    private readonly StockLedger _ledger;
    private readonly ILogger<AdminStockController> _logger;

    public AdminStockController(
        CatalogDbContext context,
        StockLedger ledger,
        ILogger<AdminStockController> logger)
    {
        _context = context;
        _ledger = ledger;
        _logger = logger;
    }

    [HttpGet("movements")]
    public async Task<ActionResult<List<StockMovementDto>>> GetMovements(
        [FromQuery] Guid? productId,
        [FromQuery] Guid? variantId,
        [FromQuery] StockMovementType? type,
        [FromQuery] int take = 200)
    {
        var query = _context.StockMovements
            .AsNoTracking()
            .Include(m => m.ProductVariant).ThenInclude(v => v.Product)
            .AsQueryable();

        if (productId.HasValue) query = query.Where(m => m.ProductId == productId.Value);
        if (variantId.HasValue) query = query.Where(m => m.ProductVariantId == variantId.Value);
        if (type.HasValue) query = query.Where(m => m.Type == type.Value);

        var movements = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(Math.Clamp(take, 1, 1000))
            .ToListAsync();

        return Ok(movements.Select(ToDto).ToList());
    }

    /// <summary>Guncel stok tablosu ve ozet sayilari.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<StockSummaryDto>> GetSummary([FromQuery] bool lowStockOnly = false)
    {
        var variants = await _context.ProductVariants
            .AsNoTracking()
            .Include(v => v.Product)
            .Where(v => v.IsActive)
            .ToListAsync();

        var lines = variants
            .Where(v => !lowStockOnly || v.StockQuantity < LowStockThreshold)
            .OrderBy(v => v.StockQuantity)
            .Select(v => new StockLineDto(
                v.ProductId,
                v.Product?.Name ?? string.Empty,
                v.Id,
                v.Sku,
                v.Price,
                v.StockQuantity,
                v.IsActive))
            .ToList();

        return Ok(new StockSummaryDto(
            variants.Count,
            variants.Count(v => v.StockQuantity <= 0),
            variants.Count(v => v.StockQuantity > 0 && v.StockQuantity < LowStockThreshold),
            variants.Sum(v => v.StockQuantity),
            variants.Sum(v => v.Price * v.StockQuantity),
            lines));
    }

    /// <summary>
    /// Manuel stok hareketi. Quantity pozitifse ekler, negatifse duser;
    /// Adjustment turunde ise verilen deger yeni stok olarak kabul edilir.
    /// </summary>
    [HttpPost("adjust")]
    public async Task<ActionResult<StockMovementDto>> Adjust([FromBody] StockAdjustRequest request)
    {
        var variant = await _context.ProductVariants
            .Include(v => v.Product)
            .FirstOrDefaultAsync(v => v.Id == request.VariantId);

        if (variant is null) return NotFound("Varyant bulunamadı.");

        var previousStock = variant.StockQuantity;

        var delta = request.Type switch
        {
            StockMovementType.Adjustment => request.Quantity - previousStock,
            StockMovementType.Out => -Math.Abs(request.Quantity),
            _ => Math.Abs(request.Quantity)
        };

        if (delta == 0)
            return BadRequest("Stokta değişiklik oluşmuyor.");

        if (previousStock + delta < 0)
            return BadRequest($"Stok negatife düşemez. Mevcut: {previousStock}, istenen değişim: {delta}");

        variant.StockQuantity = previousStock + delta;
        variant.UpdatedAt = DateTime.UtcNow;

        var movement = _ledger.Record(
            variant,
            request.Type,
            delta,
            previousStock,
            request.Reference,
            request.Note,
            createdBy: User.Identity?.Name ?? "admin");

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Stok düzeltmesi: {Sku} {Previous} -> {New}", variant.Sku, previousStock, variant.StockQuantity);

        return Ok(ToDto(movement, variant));
    }

    private static StockMovementDto ToDto(StockMovement m) =>
        ToDto(m, m.ProductVariant);

    private static StockMovementDto ToDto(StockMovement m, ProductVariant? variant) => new(
        m.Id,
        m.ProductId,
        variant?.Product?.Name ?? string.Empty,
        m.ProductVariantId,
        variant?.Sku ?? string.Empty,
        m.Type,
        TypeNames.TryGetValue(m.Type, out var name) ? name : m.Type.ToString(),
        m.Quantity,
        m.PreviousStock,
        m.NewStock,
        m.Reference,
        m.Note,
        m.CreatedBy,
        m.CreatedAt);
}
