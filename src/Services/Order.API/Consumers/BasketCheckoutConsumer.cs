using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Order.API.Domain.AggregatesModel.OrderAggregate;
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
        _logger.LogInformation("Yeni sipariş mesajı geldi. Kullanıcı={UserName}", msg.UserName);

        var address = new Address(
            street: msg.AddressLine,
            city: "",
            state: "",
            country: "",
            zipCode: ""
        );

        var order = new OrderEntity(
            buyerId: msg.UserName,
            address: address,
            description: ""
        );

        order.SetContact(msg.FirstName, msg.LastName, msg.EmailAddress);

        if (msg.BasketItems != null && msg.BasketItems.Count > 0)
        {
            foreach (var item in msg.BasketItems)
            {
                if (string.IsNullOrEmpty(item.ProductId) || !Guid.TryParse(item.ProductId, out var productId))
                {
                    _logger.LogWarning("Geçersiz ProductId atlanıyor: {ProductId}", item.ProductId ?? "(null)");
                    continue;
                }

                order.AddOrderItem(
                    productId: productId,
                    productName: item.ProductName ?? "-",
                    unitPrice: item.Price,
                    pictureUrl: item.PictureUrl,
                    units: item.Quantity,
                    selectedAttributes: null
                );
            }
        }

        // Sepet servisi kupon/kargo kirilimini de gonderir; eski mesajlarda bu alanlar 0'dir
        var itemsTotal = order.OrderItems.Sum(i => i.UnitPrice * i.Units);
        var total = msg.TotalPrice > 0 ? msg.TotalPrice : itemsTotal;

        order.SetTotals(
            totalPrice: total,
            discountAmount: msg.DiscountAmount,
            couponCode: msg.CouponCode,
            shippingCost: msg.ShippingCost);

        _dbContext.Orders.Add(order);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Sipariş kaydedildi. OrderId={OrderId}, ItemCount={Count}",
            order.Id, order.OrderItems.Count);

        var orderCreatedEvent = new OrderCreatedEvent
        {
            OrderId = order.Id,
            BuyerId = order.BuyerId,
            Email = msg.EmailAddress,
            TotalPrice = order.TotalAmount,
            CardName = string.Empty,
            CardNumber = string.Empty,
            Expiration = string.Empty,
            CVV = string.Empty,
            OrderItems = order.OrderItems.Select(i => new OrderItemMessage
            {
                ProductId = i.ProductId.ToString(),
                ProductName = i.ProductName,
                PictureUrl = i.PictureUrl,
                Price = i.UnitPrice,
                Quantity = i.Units
            }).ToList()
        };

        await _publishEndpoint.Publish(orderCreatedEvent);
        _logger.LogInformation("OrderCreatedEvent yayımlandı. OrderId={OrderId}.", order.Id);
    }
}
