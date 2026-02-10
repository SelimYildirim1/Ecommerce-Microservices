using MassTransit;
using Core.Shared.Events;

namespace Notification.API.Consumers;

public class PaymentFailedConsumer : IConsumer<PaymentFailedEvent>
{
    private readonly ILogger<PaymentFailedConsumer> _logger;

    public PaymentFailedConsumer(ILogger<PaymentFailedConsumer> logger)
    {
        _logger = logger;
    }

    public Task Consume(ConsumeContext<PaymentFailedEvent> context)
    {
        var message = context.Message;
        
        // Gerçek dünyada burada SMTP ile mail atılır.
        // Biz loglara yazarak simüle ediyoruz.
        
        _logger.LogWarning($"📧 ÖDEME BAŞARISIZ BİLDİRİMİ GÖNDERİLDİ: {message.Email}");
        _logger.LogWarning($"   Sipariş ID: {message.OrderId}");
        _logger.LogWarning($"   Sebep: {message.Reason}");
        _logger.LogWarning("   Sayın Müşterimiz, ödemeniz alınamadığı için siparişiniz iptal edilmiştir.");

        return Task.CompletedTask;
    }
}
