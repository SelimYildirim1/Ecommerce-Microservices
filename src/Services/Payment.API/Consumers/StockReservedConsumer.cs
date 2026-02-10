using MassTransit;
using Core.Shared.Events;

namespace Payment.API.Consumers;

public class StockReservedConsumer : IConsumer<StockReservedEvent>
{
    private readonly ILogger<StockReservedConsumer> _logger;
    private readonly IPublishEndpoint _publishEndpoint;

    public StockReservedConsumer(ILogger<StockReservedConsumer> logger, IPublishEndpoint publishEndpoint)
    {
        _logger = logger;
        _publishEndpoint = publishEndpoint;
    }

    public async Task Consume(ConsumeContext<StockReservedEvent> context)
    {
        var message = context.Message;
        
        _logger.LogInformation("--- ÖDEME İŞLEMİ BAŞLADI (Stok Ayrıldı) ---");
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
            
            // Telafi Edici İşlem: Catalog servisine stoğu geri eklemesi için haber ver
            // Stok daha önce düşüldüğü için artık iade edilmeli!
            await _publishEndpoint.Publish(new PaymentFailedEvent
            {
                OrderId = message.OrderId,
                Email = message.Email,
                Reason = "Yetersiz bakiye veya kart limiti",
                OrderItems = message.OrderItems
            });
            _logger.LogWarning("PaymentFailedEvent yayımlandı. OrderId={OrderId}", message.OrderId);
        }
    }
}
