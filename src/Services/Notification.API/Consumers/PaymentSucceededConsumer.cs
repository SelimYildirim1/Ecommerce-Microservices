using MassTransit;
using Core.Shared.Events;

namespace Notification.API.Consumers;

public class PaymentSucceededConsumer : IConsumer<PaymentSucceededEvent>
{
    private readonly ILogger<PaymentSucceededConsumer> _logger;

    public PaymentSucceededConsumer(ILogger<PaymentSucceededConsumer> logger)
    {
        _logger = logger;
    }

    public Task Consume(ConsumeContext<PaymentSucceededEvent> context)
    {
        var message = context.Message;
        
        _logger.LogInformation("🔔 BİLDİRİM SERVİSİ TETİKLENDİ!");
        _logger.LogInformation("--------------------------------------------------");
        _logger.LogInformation($"📧 E-POSTA GÖNDERİLİYOR: {message.Email}");
        _logger.LogInformation($"📄 Sipariş ID: {message.OrderId}");
        _logger.LogInformation("✅ Mesaj: 'Ödemeniz başarıyla alınmıştır. Siparişiniz hazırlanıyor.'");
        _logger.LogInformation("--------------------------------------------------");

        return Task.CompletedTask;
    }
}
