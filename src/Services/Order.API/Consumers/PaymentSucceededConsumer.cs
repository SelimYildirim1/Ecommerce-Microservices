using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Order.API.Consumers;

/// <summary>
/// Payment.API'den gelen PaymentSucceededEvent'i dinler ve
/// sipariş durumunu "Paid" olarak günceller.
/// </summary>
public class PaymentSucceededConsumer : IConsumer<PaymentSucceededEvent>
{
    private readonly OrderDbContext _context;
    private readonly ILogger<PaymentSucceededConsumer> _logger;

    public PaymentSucceededConsumer(OrderDbContext context, ILogger<PaymentSucceededConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentSucceededEvent> context)
    {
        // 👇 TEST İÇİN GEÇİCİ KOD:
        // Rastgele hata fırlat (Retry politikasını test etmek için)
        // var random = new Random().Next(1, 10);
        // if (random < 5)
        // {
        //     _logger.LogError("⚠️ Simüle edilmiş bir hata oluştu! Tekrar denenmesi bekleniyor...");
        //     throw new Exception("Veritabanı anlık kilitlendi! (Simülasyon)");
        // }

        var msg = context.Message;
        _logger.LogInformation("PaymentSucceededEvent alındı. OrderId={OrderId}", msg.OrderId);

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == msg.OrderId, context.CancellationToken);
        if (order == null)
        {
            _logger.LogWarning("Sipariş bulunamadı! OrderId={OrderId}", msg.OrderId);
            return;
        }

        var previousStatus = order.OrderStatus;
        order.OrderStatus = "Paid";
        
        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("✅ Sipariş durumu güncellendi. OrderId={OrderId}, {Previous} -> Paid", 
            msg.OrderId, previousStatus);
    }
}
