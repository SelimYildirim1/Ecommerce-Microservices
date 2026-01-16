using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using OrderEntity = Order.API.Entities.Order; // İsim çakışmasını önlemek için

namespace Order.API.Consumers;

public class BasketCheckoutConsumer : IConsumer<BasketCheckoutEvent>
{
    private readonly OrderDbContext _context;
    private readonly ILogger<BasketCheckoutConsumer> _logger;

    public BasketCheckoutConsumer(OrderDbContext context, ILogger<BasketCheckoutConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<BasketCheckoutEvent> context)
    {
        // 1. Gelen mesajı oku
        var eventData = context.Message;
        
        _logger.LogInformation("Yeni Sipariş Mesajı Geldi! Kullanıcı: {UserName}", eventData.UserName);

        // 2. Sipariş nesnesini oluştur
        var newOrder = new OrderEntity
        {
            Id = Guid.NewGuid(),
            UserName = eventData.UserName,
            TotalPrice = eventData.TotalPrice,
            FirstName = eventData.FirstName,
            LastName = eventData.LastName,
            EmailAddress = eventData.EmailAddress,
            AddressLine = eventData.AddressLine,
            CreatedDate = DateTime.UtcNow
        };

        // 3. Veritabanına kaydet
        _context.Orders.Add(newOrder);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Sipariş başarıyla veritabanına kaydedildi. ID: {Id}", newOrder.Id);
    }
}