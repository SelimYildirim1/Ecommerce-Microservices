using MassTransit;
using Core.Shared.Events;
using Catalog.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Consumers;

/// <summary>
/// Ödeme başarısız olduğunda stoğu geri ekler.
/// Bu, Saga Pattern'ın "Compensating Transaction" (Telafi Edici İşlem) parçasıdır.
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
        _logger.LogWarning("⚠️ PaymentFailedEvent alındı! OrderId={OrderId}, Sebep={Reason}",
            msg.OrderId, msg.Reason);

        if (msg.OrderItems == null || msg.OrderItems.Count == 0)
        {
            _logger.LogWarning("OrderItems boş, stok geri ekleme atlanıyor.");
            return;
        }

        _logger.LogInformation("🔄 STOK GERİ EKLEME BAŞLADI (Compensating Transaction)");

        foreach (var item in msg.OrderItems)
        {
            if (string.IsNullOrEmpty(item.ProductId))
            {
                _logger.LogWarning("ProductId boş, atlanıyor.");
                continue;
            }
            if (!Guid.TryParse(item.ProductId, out var productId))
            {
                _logger.LogWarning("Geçersiz ProductId: {ProductId}", item.ProductId);
                continue;
            }

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId, context.CancellationToken);
            if (product == null)
            {
                _logger.LogWarning("Ürün bulunamadı, stok geri eklenemedi. ProductId={ProductId}", item.ProductId);
                continue;
            }

            var previousStock = product.StockQuantity;
            product.StockQuantity += item.Quantity;  // STOK GERİ EKLEME
            
            _logger.LogInformation("🔄 STOK GERİ EKLENDİ! ProductId={ProductId}, {Previous} -> {New} (+{Qty})",
                item.ProductId, previousStock, product.StockQuantity, item.Quantity);
        }

        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("✅ Telafi işlemi tamamlandı. Stoklar geri eklendi. OrderId={OrderId}", msg.OrderId);
    }
}
