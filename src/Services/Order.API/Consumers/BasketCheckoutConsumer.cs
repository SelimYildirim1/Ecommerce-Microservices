using MassTransit;
using Core.Shared.Events;
using Microsoft.EntityFrameworkCore;
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
            street: msg.AddressLine ?? string.Empty,
            city: msg.City ?? string.Empty,
            state: msg.State ?? string.Empty,
            country: msg.Country ?? string.Empty,
            zipCode: msg.ZipCode ?? string.Empty
        );

        var order = new OrderEntity(
            buyerId: msg.UserName,
            address: address,
            description: msg.OrderNote ?? ""
        );

        order.SetGiftOptions(msg.GiftWrap, msg.GiftMessage);

        order.SetContact(msg.FirstName, msg.LastName, msg.EmailAddress);
        order.SetInvoice(msg.InvoiceType, msg.TaxId, msg.TaxOffice, msg.CompanyName);
        order.SetPaymentMethod(msg.PaymentMethod);
        order.SetBillingAddress(
            sameAsShipping: msg.BillingSameAsShipping ?? true,
            addressLine: msg.BillingAddressLine,
            city: msg.BillingCity,
            state: msg.BillingState,
            country: msg.BillingCountry,
            zipCode: msg.BillingZipCode);

        var orderNumber = !string.IsNullOrWhiteSpace(msg.OrderNumber)
            ? msg.OrderNumber.Trim()
            : await GenerateUniqueOrderNumberAsync(context.CancellationToken);
        order.SetOrderNumber(orderNumber);
        order.AddStatusHistory("Submitted", "Sipariş oluşturuldu");

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

        _logger.LogInformation(
            "Sipariş kaydedildi. OrderId={OrderId}, OrderNumber={OrderNumber}, ItemCount={Count}",
            order.Id, order.OrderNumber, order.OrderItems.Count);

        var orderCreatedEvent = new OrderCreatedEvent
        {
            OrderId = order.Id,
            OrderNumber = order.OrderNumber,
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
        _logger.LogInformation(
            "OrderCreatedEvent yayımlandı. OrderId={OrderId}, OrderNumber={OrderNumber}.",
            order.Id, order.OrderNumber);
    }

    private async Task<string> GenerateUniqueOrderNumberAsync(CancellationToken ct)
    {
        var prefix = $"YS-{DateTime.UtcNow:yyMMdd}-";
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var candidate = prefix + Random.Shared.Next(0, 10000).ToString("D4");
            var exists = await _dbContext.Orders.AnyAsync(o => o.OrderNumber == candidate, ct);
            if (!exists) return candidate;
        }

        // Son çare: daha benzersiz sonek
        return prefix + Random.Shared.Next(1000, 9999) + Random.Shared.Next(10, 99);
    }
}
