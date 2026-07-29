using MassTransit;
using Core.Shared.Events;
using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Services;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Consumers;

public class OrderCreatedConsumer : IConsumer<OrderCreatedEvent>
{
    private readonly CatalogDbContext _context;
    private readonly StockLedger _ledger;
    private readonly ILogger<OrderCreatedConsumer> _logger;

    public OrderCreatedConsumer(
        CatalogDbContext context,
        StockLedger ledger,
        ILogger<OrderCreatedConsumer> logger)
    {
        _context = context;
        _ledger = ledger;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCreatedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("OrderCreatedEvent alındı. Stok kontrolü başlıyor. OrderId={OrderId}", msg.OrderId);

        if (msg.OrderItems == null || msg.OrderItems.Count == 0)
        {
            await PublishStockReserved(context);
            return;
        }

        // ProductId varyant kimligi tasir; eski sepetlerde urun kimligi de gelebilir
        var orderItemGroups = msg.OrderItems
            .GroupBy(x => x.ProductId)
            .ToList();

        var resolvedVariants = new Dictionary<string, Catalog.API.Entities.ProductVariant>();

        foreach (var group in orderItemGroups)
        {
            if (!Guid.TryParse(group.Key, out var id))
            {
                await PublishStockNotReserved(context, $"Geçersiz ProductId: {group.Key}");
                return;
            }

            var totalRequestedQty = group.Sum(x => x.Quantity);

            var variant = await ResolveVariantAsync(id, totalRequestedQty);

            if (variant == null)
            {
                await PublishStockNotReserved(context, $"Varyant bulunamadı. Id={id}");
                return;
            }

            if (variant.StockQuantity < totalRequestedQty)
            {
                await PublishStockNotReserved(context,
                    $"Yetersiz stok. Ürün: {variant.Product.Name} (SKU: {variant.Sku}), Stok: {variant.StockQuantity}, İstenen: {totalRequestedQty}");
                return;
            }

            resolvedVariants[group.Key] = variant;
        }

        // Tüm varyantlar için stok yeterli - düş
        foreach (var group in orderItemGroups)
        {
            var variant = resolvedVariants[group.Key];
            var qty = group.Sum(x => x.Quantity);
            var previousStock = variant.StockQuantity;
            variant.StockQuantity -= qty;

            _ledger.Record(
                variant,
                StockMovementType.Sale,
                -qty,
                previousStock,
                reference: msg.OrderId.ToString(),
                note: "Sipariş nedeniyle düşüldü");
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Stoklar güncellendi. OrderId={OrderId}", msg.OrderId);

        await PublishStockReserved(context);
    }

    /// <summary>
    /// Once varyant kimligi olarak arar. Bulamazsa kimligi urun kimligi kabul edip
    /// istenen adedi karsilayabilen ilk aktif varyanti secer; varyant secmeyen eski
    /// istemcilerin siparisleri de boylece islenebilir.
    /// </summary>
    private async Task<Catalog.API.Entities.ProductVariant?> ResolveVariantAsync(Guid id, int requestedQuantity)
    {
        var variant = await _context.ProductVariants
            .Include(v => v.Product)
            .FirstOrDefaultAsync(v => v.Id == id);

        if (variant != null) return variant;

        var candidates = await _context.ProductVariants
            .Include(v => v.Product)
            .Where(v => v.ProductId == id && v.IsActive)
            .OrderByDescending(v => v.StockQuantity)
            .ToListAsync();

        return candidates.FirstOrDefault(v => v.StockQuantity >= requestedQuantity)
            ?? candidates.FirstOrDefault();
    }

    private async Task PublishStockReserved(ConsumeContext<OrderCreatedEvent> context)
    {
        var msg = context.Message;
        var reservedEvent = new StockReservedEvent
        {
            OrderId = msg.OrderId,
            BuyerId = msg.BuyerId,
            Email = msg.Email,
            TotalPrice = msg.TotalPrice,
            CardName = string.Empty,
            CardNumber = string.Empty,
            Expiration = string.Empty,
            CVV = string.Empty,
            OrderItems = msg.OrderItems
        };

        await context.Publish(reservedEvent);
        _logger.LogInformation("StockReservedEvent yayımlandı. OrderId={OrderId}", msg.OrderId);
    }

    private async Task PublishStockNotReserved(ConsumeContext<OrderCreatedEvent> context, string reason)
    {
        var msg = context.Message;
        _logger.LogWarning("Stok rezervasyonu başarısız. OrderId={OrderId}, Sebep={Reason}", msg.OrderId, reason);

        var failEvent = new StockNotReservedEvent
        {
            OrderId = msg.OrderId,
            BuyerId = msg.BuyerId,
            Email = msg.Email,
            Reason = reason
        };

        await context.Publish(failEvent);
    }
}
