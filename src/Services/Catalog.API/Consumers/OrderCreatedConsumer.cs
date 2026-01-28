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
        _logger.LogInformation("OrderCreatedEvent alındı. OrderId={OrderId}, ItemCount={Count}",
            msg.OrderId, msg.OrderItems?.Count ?? 0);

        if (msg.OrderItems == null || msg.OrderItems.Count == 0)
        {
            _logger.LogInformation("Siparişte ürün yok, stok güncellemesi atlanıyor.");
            return;
        }

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
                _logger.LogWarning("Ürün bulunamadı, stok düşülmedi. ProductId={ProductId}", item.ProductId);
                continue;
            }

            var previousStock = product.StockQuantity;
            product.StockQuantity -= item.Quantity;
            if (product.StockQuantity < 0)
            {
                _logger.LogWarning("ProductId={ProductId} stok negatife düştü: {Previous} -> {New}",
                    item.ProductId, previousStock, product.StockQuantity);
            }
            else
            {
                _logger.LogInformation("Stok düşüldü. ProductId={ProductId}, {Previous} -> {New} (-{Qty})",
                    item.ProductId, previousStock, product.StockQuantity, item.Quantity);
            }
        }

        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("Stok güncellemeleri kaydedildi. OrderId={OrderId}", msg.OrderId);
    }
}
