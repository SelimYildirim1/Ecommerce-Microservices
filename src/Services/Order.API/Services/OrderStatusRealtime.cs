using Microsoft.AspNetCore.SignalR;
using Order.API.Hubs;
using OrderEntity = Order.API.Entities.Order;

namespace Order.API.Services;

public static class OrderStatusRealtime
{
    public static async Task NotifyAsync(
        IHubContext<OrderStatusHub> hub,
        OrderEntity order,
        ILogger? logger = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userGroup = OrderStatusHub.GetUserGroupName(order.BuyerId);
            await hub.Clients.Group(userGroup).SendAsync(
                "OrderStatusUpdated",
                new
                {
                    orderId = order.Id,
                    orderNumber = order.OrderNumber,
                    status = order.OrderStatus,
                    updatedAt = DateTime.UtcNow
                },
                cancellationToken);

            logger?.LogInformation(
                "SignalR - OrderStatusUpdated gönderildi. OrderId={OrderId}, Status={Status}",
                order.Id, order.OrderStatus);
        }
        catch (Exception ex)
        {
            logger?.LogError(
                ex,
                "SignalR üzerinden OrderStatusUpdated gönderilirken hata oluştu. OrderId={OrderId}",
                order.Id);
        }
    }
}
