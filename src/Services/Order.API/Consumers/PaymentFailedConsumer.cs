using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Order.API.Hubs;
using Order.API.Services;

namespace Order.API.Consumers;

public class PaymentFailedConsumer : IConsumer<PaymentFailedEvent>
{
    private readonly OrderDbContext _context;
    private readonly ILogger<PaymentFailedConsumer> _logger;
    private readonly IHubContext<OrderStatusHub> _hubContext;

    public PaymentFailedConsumer(
        OrderDbContext context,
        ILogger<PaymentFailedConsumer> logger,
        IHubContext<OrderStatusHub> hubContext)
    {
        _context = context;
        _logger = logger;
        _hubContext = hubContext;
    }

    public async Task Consume(ConsumeContext<PaymentFailedEvent> context)
    {
        var message = context.Message;
        _logger.LogInformation("PaymentFailedEvent alındı. Sipariş iptal ediliyor. OrderId: {OrderId}", message.OrderId);

        var order = await _context.Orders.FirstOrDefaultAsync(x => x.Id == message.OrderId);

        if (order == null)
        {
            _logger.LogError("Sipariş bulunamadı! OrderId: {OrderId}", message.OrderId);
            return;
        }

        order.SetStatus("Failed");
        await _context.SaveChangesAsync();

        _logger.LogInformation("Sipariş durumu FAILED olarak güncellendi. OrderId: {OrderId}", message.OrderId);
        await OrderStatusRealtime.NotifyAsync(_hubContext, order, _logger, context.CancellationToken);
    }
}
