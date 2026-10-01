using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Order.API.Hubs;
using Order.API.Services;
using Order.API.Services.IntegraOps;

namespace Order.API.Consumers;

/// <summary>
/// Payment.API'den gelen PaymentSucceededEvent'i dinler ve
/// sipariş durumunu "Paid" olarak günceller.
/// </summary>
public class PaymentSucceededConsumer : IConsumer<PaymentSucceededEvent>
{
    private readonly OrderDbContext _context;
    private readonly ILogger<PaymentSucceededConsumer> _logger;
    private readonly IHubContext<OrderStatusHub> _hubContext;
    private readonly IntegraOpsNotifier _integraOps;

    public PaymentSucceededConsumer(
        OrderDbContext context,
        ILogger<PaymentSucceededConsumer> logger,
        IHubContext<OrderStatusHub> hubContext,
        IntegraOpsNotifier integraOps)
    {
        _integraOps = integraOps;
        _context = context;
        _logger = logger;
        _hubContext = hubContext;
    }

    public async Task Consume(ConsumeContext<PaymentSucceededEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("PaymentSucceededEvent alındı. OrderId={OrderId}", msg.OrderId);

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == msg.OrderId, context.CancellationToken);
        if (order == null)
        {
            _logger.LogWarning("Sipariş bulunamadı! OrderId={OrderId}", msg.OrderId);
            return;
        }

        var previousStatus = order.OrderStatus;
        order.SetStatus("Paid");
        _context.OrderStatusHistories.Add(new Order.API.Entities.OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Status = "Paid",
            Note = "Ödeme alındı",
            CreatedAt = DateTime.UtcNow
        });

        await _integraOps.TrackPaidAsync(order, context.CancellationToken);
        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("Sipariş durumu güncellendi. OrderId={OrderId}, OrderNumber={OrderNumber}, {Previous} -> Paid",
            msg.OrderId, order.OrderNumber, previousStatus);

        await OrderStatusRealtime.NotifyAsync(_hubContext, order, _logger, context.CancellationToken);
    }
}
