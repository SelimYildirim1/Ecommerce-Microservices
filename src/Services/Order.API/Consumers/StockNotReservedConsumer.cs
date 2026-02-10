using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Order.API.Consumers;

public class StockNotReservedConsumer : IConsumer<StockNotReservedEvent>
{
    private readonly OrderDbContext _dbContext;
    private readonly ILogger<StockNotReservedConsumer> _logger;

    public StockNotReservedConsumer(OrderDbContext dbContext, ILogger<StockNotReservedConsumer> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<StockNotReservedEvent> context)
    {
        var msg = context.Message;
        _logger.LogWarning("StockNotReservedEvent alındı. OrderId={OrderId}, Sebep={Reason}", msg.OrderId, msg.Reason);

        var order = await _dbContext.Orders.FindAsync(msg.OrderId);

        if (order == null)
        {
            _logger.LogError("Sipariş bulunamadı! OrderId={OrderId}", msg.OrderId);
            return;
        }

        order.OrderStatus = "StockFailed"; // Stok yetersiz yüzünden iptal
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Sipariş durumu güncellendi: StockFailed. OrderId={OrderId}", msg.OrderId);
    }
}
