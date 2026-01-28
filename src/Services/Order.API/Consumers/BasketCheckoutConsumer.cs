using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Order.API.Entities;
using OrderEntity = Order.API.Entities.Order;

namespace Order.API.Consumers;

public class BasketCheckoutConsumer : IConsumer<BasketCheckoutEvent>
{
    private readonly OrderDbContext _dbContext;
    private readonly ILogger<BasketCheckoutConsumer> _logger;
    private readonly IPublishEndpoint _publishEndpoint;

    public BasketCheckoutConsumer(
        OrderDbContext dbContext,
        ILogger<BasketCheckoutConsumer> logger,
        IPublishEndpoint publishEndpoint)
    {
        _dbContext = dbContext;
        _logger = logger;
        _publishEndpoint = publishEndpoint;
    }

    public async Task Consume(ConsumeContext<BasketCheckoutEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Yeni sipariş mesajı geldi. Kullanıcı={UserName}, CardName={CardName}",
            msg.UserName, msg.CardName);

        var order = new OrderEntity
        {
            UserName = msg.UserName,
            TotalPrice = msg.TotalPrice,
            FirstName = msg.FirstName,
            LastName = msg.LastName,
            EmailAddress = msg.EmailAddress,
            AddressLine = msg.AddressLine,
            CreatedDate = DateTime.UtcNow
        };

        if (msg.BasketItems != null && msg.BasketItems.Count > 0)
        {
            foreach (var item in msg.BasketItems)
            {
                if (string.IsNullOrEmpty(item.ProductId) || !Guid.TryParse(item.ProductId, out var productId))
                {
                    _logger.LogWarning("Geçersiz ProductId atlanıyor: {ProductId}", item.ProductId ?? "(null)");
                    continue;
                }
                order.OrderItems.Add(new OrderItem
                {
                    ProductId = productId,
                    ProductName = item.ProductName ?? "-",
                    Price = item.Price,
                    Quantity = item.Quantity
                });
            }
        }

        _dbContext.Orders.Add(order);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Sipariş kaydedildi. OrderId={OrderId}, ItemCount={Count}", order.Id, order.OrderItems.Count);

        var orderCreatedEvent = new OrderCreatedEvent
        {
            OrderId = order.Id,
            BuyerId = order.UserName,
            Email = order.EmailAddress,
            TotalPrice = order.TotalPrice,
            CardName = msg.CardName,
            CardNumber = msg.CardNumber,
            Expiration = msg.Expiration,
            CVV = msg.CVV,
            OrderItems = order.OrderItems.Select(i => new OrderItemMessage
            {
                ProductId = i.ProductId.ToString(),
                ProductName = i.ProductName,
                PictureUrl = null,
                Price = i.Price,
                Quantity = i.Quantity
            }).ToList()
        };

        await _publishEndpoint.Publish(orderCreatedEvent);
        _logger.LogInformation("OrderCreatedEvent yayımlandı. OrderId={OrderId}. Payment ve Catalog dinliyor.", order.Id);
    }
}