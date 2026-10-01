using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Order.API.Hubs;
using Order.API.Services;
using Order.API.Services.IntegraOps;

namespace Order.API.Consumers;

public class StockNotReservedConsumer : IConsumer<StockNotReservedEvent>
{
    private readonly OrderDbContext _dbContext;
    private readonly ILogger<StockNotReservedConsumer> _logger;
    private readonly IHubContext<OrderStatusHub> _hubContext;
    private readonly IntegraOpsNotifier _integraOps;

    public StockNotReservedConsumer(
        OrderDbContext dbContext,
        ILogger<StockNotReservedConsumer> logger,
        IHubContext<OrderStatusHub> hubContext,
        IntegraOpsNotifier integraOps)
    {
        _integraOps = integraOps;
        _dbContext = dbContext;
        _logger = logger;
        _hubContext = hubContext;
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

        order.SetStatus("StockFailed");
        await _integraOps.TrackAsync(
            order, IntegraOpsNotifier.StockReserved, IntegraOpsNotifier.Failed, msg.Reason, context.CancellationToken);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Sipariş durumu güncellendi: StockFailed. OrderId={OrderId}", msg.OrderId);
        await OrderStatusRealtime.NotifyAsync(_hubContext, order, _logger, context.CancellationToken);
    }
}
