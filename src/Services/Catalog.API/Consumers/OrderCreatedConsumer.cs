using MassTransit;
using Core.Shared.Events;
using Catalog.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Consumers;

public class OrderCreatedConsumer : IConsumer<OrderCreatedEvent>
{
    private readonly CatalogDbContext _context;
    private readonly ILogger<OrderCreatedConsumer> _logger;

    public OrderCreatedConsumer(CatalogDbContext context, ILogger<OrderCreatedConsumer> logger)
    {
        _context = context;
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

        // ProductId artık varyant ID'si olarak kullanılıyor
        var orderItemGroups = msg.OrderItems
            .GroupBy(x => x.ProductId)
            .ToList();

        var variantsToUpdate = new List<Catalog.API.Entities.ProductVariant>();

        foreach (var group in orderItemGroups)
        {
            if (!Guid.TryParse(group.Key, out var variantId))
            {
                await PublishStockNotReserved(context, $"Geçersiz ProductId: {group.Key}");
                return;
            }

            var totalRequestedQty = group.Sum(x => x.Quantity);

            // Varyant üzerinden stok kontrolü
            var variant = await _context.ProductVariants
                .Include(v => v.Product)
                .FirstOrDefaultAsync(v => v.Id == variantId);

            if (variant == null)
            {
                await PublishStockNotReserved(context, $"Varyant bulunamadı. Id={variantId}");
                return;
            }

            if (variant.StockQuantity < totalRequestedQty)
            {
                await PublishStockNotReserved(context,
                    $"Yetersiz stok. Ürün: {variant.Product.Name} (SKU: {variant.Sku}), Stok: {variant.StockQuantity}, İstenen: {totalRequestedQty}");
                return;
            }

            variantsToUpdate.Add(variant);
        }

        // Tüm varyantlar için stok yeterli - düş
        foreach (var group in orderItemGroups)
        {
            var variant = variantsToUpdate.First(v => v.Id == Guid.Parse(group.Key));
            var qty = group.Sum(x => x.Quantity);
            variant.StockQuantity -= qty;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Stoklar güncellendi. OrderId={OrderId}", msg.OrderId);

        await PublishStockReserved(context);
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
            CardName = msg.CardName,
            CardNumber = msg.CardNumber,
            Expiration = msg.Expiration,
            CVV = msg.CVV,
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
