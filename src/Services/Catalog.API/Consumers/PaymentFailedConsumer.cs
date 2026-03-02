using MassTransit;
using Core.Shared.Events;
using Catalog.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Consumers;

/// <summary>
/// Ödeme başarısız olduğunda stoğu geri ekler.
/// Saga Pattern'ın "Compensating Transaction" parçasıdır.
/// </summary>
public class PaymentFailedConsumer : IConsumer<PaymentFailedEvent>
{
    private readonly CatalogDbContext _context;
    private readonly ILogger<PaymentFailedConsumer> _logger;

    public PaymentFailedConsumer(CatalogDbContext context, ILogger<PaymentFailedConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentFailedEvent> context)
    {
        var msg = context.Message;
        _logger.LogWarning("PaymentFailedEvent alındı! OrderId={OrderId}, Sebep={Reason}",
            msg.OrderId, msg.Reason);

        if (msg.OrderItems == null || msg.OrderItems.Count == 0)
        {
            _logger.LogWarning("OrderItems boş, stok geri ekleme atlanıyor.");
            return;
        }

        _logger.LogInformation("STOK GERİ EKLEME BAŞLADI (Compensating Transaction)");

        foreach (var item in msg.OrderItems)
        {
            if (string.IsNullOrEmpty(item.ProductId)) continue;
            if (!Guid.TryParse(item.ProductId, out var variantId)) continue;

            // Stok artık varyant üzerinde
            var variant = await _context.ProductVariants
                .Include(v => v.Product)
                .FirstOrDefaultAsync(v => v.Id == variantId, context.CancellationToken);

            if (variant == null)
            {
                _logger.LogWarning("Varyant bulunamadı, stok geri eklenemedi. VariantId={VariantId}", item.ProductId);
                continue;
            }

            var previousStock = variant.StockQuantity;
            variant.StockQuantity += item.Quantity;

            _logger.LogInformation("STOK GERİ EKLENDİ! {ProductName} (SKU: {Sku}), {Previous} -> {New} (+{Qty})",
                variant.Product.Name, variant.Sku, previousStock, variant.StockQuantity, item.Quantity);
        }

        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("Telafi işlemi tamamlandı. Stoklar geri eklendi. OrderId={OrderId}", msg.OrderId);
    }
}
