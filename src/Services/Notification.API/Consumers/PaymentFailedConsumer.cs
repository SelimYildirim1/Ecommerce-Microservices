using MassTransit;
using Core.Shared.Events;
using Notification.API.Services;

namespace Notification.API.Consumers;

public class PaymentFailedConsumer : IConsumer<PaymentFailedEvent>
{
    private readonly IEmailSender _emailSender;
    private readonly ILogger<PaymentFailedConsumer> _logger;

    public PaymentFailedConsumer(
        IEmailSender emailSender,
        ILogger<PaymentFailedConsumer> logger)
    {
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentFailedEvent> context)
    {
        var message = context.Message;

        _logger.LogWarning(
            "Ödeme başarısız bildirimi hazırlanıyor. OrderId={OrderId}, Sebep={Reason}",
            message.OrderId, message.Reason);

        var (subject, body) = EmailTemplates.PaymentFailed(message.OrderId, message.Reason);

        await _emailSender.SendAsync(message.Email, subject, body, context.CancellationToken);
    }
}
