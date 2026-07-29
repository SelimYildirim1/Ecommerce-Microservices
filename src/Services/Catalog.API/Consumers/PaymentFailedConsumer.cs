using MassTransit;
using Core.Shared.Events;
using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Services;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Consumers;

/// <summary>
/// Ödeme başarısız olduğunda stoğu geri ekler.
/// Saga Pattern'ın "Compensating Transaction" parçasıdır.
/// </summary>
public class PaymentFailedConsumer : IConsumer<PaymentFailedEvent>
{
    private readonly CatalogDbContext _context;
    private readonly StockLedger _ledger;
    private readonly ILogger<PaymentFailedConsumer> _logger;

    public PaymentFailedConsumer(
        CatalogDbContext context,
        StockLedger ledger,
        ILogger<PaymentFailedConsumer> logger)
    {
        _context = context;
        _ledger = ledger;
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

        // Siparis sirasinda hangi varyanttan ne kadar dusuldugu stok hareketinde yazili;
        // geri ekleme bu kayda gore yapilir, boylece dogru varyant telafi edilir.
        var saleMovements = await _context.StockMovements
            .Where(m => m.Reference == msg.OrderId.ToString() && m.Type == StockMovementType.Sale)
            .ToListAsync(context.CancellationToken);

        var restorations = saleMovements.Count > 0
            ? saleMovements.Select(m => (VariantId: m.ProductVariantId, Quantity: Math.Abs(m.Quantity)))
            : msg.OrderItems
                .Where(i => Guid.TryParse(i.ProductId, out _))
                .Select(i => (VariantId: Guid.Parse(i.ProductId), Quantity: i.Quantity));

        foreach (var (variantId, quantity) in restorations)
        {
            var variant = await _context.ProductVariants
                .Include(v => v.Product)
                .FirstOrDefaultAsync(v => v.Id == variantId, context.CancellationToken);

            if (variant == null)
            {
                _logger.LogWarning("Varyant bulunamadı, stok geri eklenemedi. VariantId={VariantId}", variantId);
                continue;
            }

            var previousStock = variant.StockQuantity;
            variant.StockQuantity += quantity;

            _ledger.Record(
                variant,
                StockMovementType.Return,
                quantity,
                previousStock,
                reference: msg.OrderId.ToString(),
                note: $"Ödeme başarısız: {msg.Reason}");

            _logger.LogInformation("STOK GERİ EKLENDİ! {ProductName} (SKU: {Sku}), {Previous} -> {New} (+{Qty})",
                variant.Product.Name, variant.Sku, previousStock, variant.StockQuantity, quantity);
        }

        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("Telafi işlemi tamamlandı. Stoklar geri eklendi. OrderId={OrderId}", msg.OrderId);
    }
}
