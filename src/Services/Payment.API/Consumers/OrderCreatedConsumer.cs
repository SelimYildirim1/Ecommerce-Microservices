using MassTransit;
using Core.Shared.Events;

namespace Payment.API.Consumers;

public class OrderCreatedConsumer : IConsumer<OrderCreatedEvent>
{
    private readonly ILogger<OrderCreatedConsumer> _logger;
    private readonly IPublishEndpoint _publishEndpoint;

    public OrderCreatedConsumer(ILogger<OrderCreatedConsumer> logger, IPublishEndpoint publishEndpoint)
    {
        _logger = logger;
        _publishEndpoint = publishEndpoint;
    }

    public async Task Consume(ConsumeContext<OrderCreatedEvent> context)
    {
        var message = context.Message;
        
        _logger.LogInformation("--- ÖDEME İŞLEMİ BAŞLADI ---");
        _logger.LogInformation($"Sipariş ID: {message.OrderId} | Tutar: {message.TotalPrice} TL");
        _logger.LogInformation($"Kart Sahibi: {message.CardName}");

        // Banka Simülasyonu (3 saniye bekleyelim)
        await Task.Delay(3000); 

        // Basit bir kural: Tutar negatif değilse ödeme başarılı sayalım
        bool isPaymentSuccess = message.TotalPrice > 0;

        if (isPaymentSuccess)
        {
            _logger.LogInformation("✅ ÖDEME BAŞARIYLA ALINDI! Bankadan onay geldi.");
            
            // Order.API'ye ödeme başarılı olduğunu bildir
            await _publishEndpoint.Publish(new PaymentSucceededEvent
            {
                OrderId = message.OrderId,
                Email = message.Email
            });
            _logger.LogInformation("PaymentSucceededEvent yayımlandı. OrderId={OrderId}", message.OrderId);
        }
        else
        {
            _logger.LogError("❌ ÖDEME BAŞARISIZ! Bakiye yetersiz.");
            // İleride PaymentFailedEvent eklenebilir
        }
    }
}