using MassTransit;
using Core.Shared.Events;
using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Services;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Consumers;

/// <summary>
/// Sipariş iptal / iade sonrası stoğu geri ekler (OrderStockReleaseEvent).
/// </summary>
public class OrderStockReleaseConsumer : IConsumer<OrderStockReleaseEvent>
{
    private readonly CatalogDbContext _context;
    private readonly StockLedger _ledger;
    private readonly ILogger<OrderStockReleaseConsumer> _logger;

    public OrderStockReleaseConsumer(
        CatalogDbContext context,
        StockLedger ledger,
        ILogger<OrderStockReleaseConsumer> logger)
    {
        _context = context;
        _ledger = ledger;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderStockReleaseEvent> context)
    {
        var msg = context.Message;
        _logger.LogWarning(
            "OrderStockReleaseEvent alındı. OrderId={OrderId}, Type={Type}, Reason={Reason}",
            msg.OrderId, msg.ReleaseType, msg.Reason);

        var saleMovements = await _context.StockMovements
            .Where(m => m.Reference == msg.OrderId.ToString() && m.Type == StockMovementType.Sale)
            .ToListAsync(context.CancellationToken);

        var restorations = saleMovements.Count > 0
            ? saleMovements.Select(m => (VariantId: m.ProductVariantId, Quantity: Math.Abs(m.Quantity)))
            : (msg.OrderItems ?? new List<OrderItemMessage>())
                .Where(i => Guid.TryParse(i.ProductId, out _))
                .Select(i => (VariantId: Guid.Parse(i.ProductId), Quantity: i.Quantity));

        var restoredAny = false;

        foreach (var (variantId, quantity) in restorations)
        {
            var variant = await _context.ProductVariants
                .Include(v => v.Product)
                .FirstOrDefaultAsync(v => v.Id == variantId, context.CancellationToken);

            if (variant is null)
            {
                _logger.LogWarning("Varyant bulunamadı. VariantId={VariantId}", variantId);
                continue;
            }

            // Aynı sipariş için daha önce iade edilmiş miktarı düş (çift iade önleme)
            var alreadyRestored = await _context.StockMovements
                .Where(m =>
                    m.Reference == msg.OrderId.ToString()
                    && m.ProductVariantId == variantId
                    && m.Type == StockMovementType.Return)
                .SumAsync(m => (int?)m.Quantity, context.CancellationToken) ?? 0;

            var toRestore = quantity - alreadyRestored;
            if (toRestore <= 0) continue;

            var previousStock = variant.StockQuantity;
            variant.StockQuantity += toRestore;

            _ledger.Record(
                variant,
                StockMovementType.Return,
                toRestore,
                previousStock,
                reference: msg.OrderId.ToString(),
                note: $"{msg.ReleaseType}: {msg.Reason}");

            restoredAny = true;
            _logger.LogInformation(
                "Stok geri eklendi ({Type}). {Sku}: {Prev} -> {New} (+{Qty})",
                msg.ReleaseType, variant.Sku, previousStock, variant.StockQuantity, toRestore);
        }

        if (restoredAny)
            await _context.SaveChangesAsync(context.CancellationToken);
        else
            _logger.LogInformation("Geri eklenecek stok yok veya zaten iade edilmiş. OrderId={OrderId}", msg.OrderId);
    }
}
