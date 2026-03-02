using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Order.API.Hubs;

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

    public PaymentSucceededConsumer(
        OrderDbContext context,
        ILogger<PaymentSucceededConsumer> logger,
        IHubContext<OrderStatusHub> hubContext)
    {
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

        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("Sipariş durumu güncellendi. OrderId={OrderId}, {Previous} -> Paid",
            msg.OrderId, previousStatus);

        // SignalR üzerinden ilgili kullanıcıya gerçek zamanlı bilgi gönder
        try
        {
            var userGroup = OrderStatusHub.GetUserGroupName(order.BuyerId);

            await _hubContext.Clients.Group(userGroup).SendAsync(
                "OrderStatusUpdated",
                new
                {
                    orderId = order.Id,
                    status = order.OrderStatus,
                    updatedAt = DateTime.UtcNow
                },
                context.CancellationToken);

            _logger.LogInformation("SignalR - OrderStatusUpdated gönderildi. OrderId={OrderId}, Status={Status}",
                order.Id, order.OrderStatus);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SignalR üzerinden OrderStatusUpdated gönderilirken hata oluştu. OrderId={OrderId}", order.Id);
        }
    }
}
