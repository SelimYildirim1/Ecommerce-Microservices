using MassTransit;
using Core.Shared.Events;
using Notification.API.Services;

namespace Notification.API.Consumers;

public class PaymentSucceededConsumer : IConsumer<PaymentSucceededEvent>
{
    private readonly IEmailSender _emailSender;
    private readonly ILogger<PaymentSucceededConsumer> _logger;

    public PaymentSucceededConsumer(
        IEmailSender emailSender,
        ILogger<PaymentSucceededConsumer> logger)
    {
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentSucceededEvent> context)
    {
        var message = context.Message;

        _logger.LogInformation(
            "Ödeme başarılı bildirimi hazırlanıyor. OrderId={OrderId}, Alıcı={Email}",
            message.OrderId, message.Email);

        var (subject, body) = EmailTemplates.PaymentSucceeded(message.OrderId);

        await _emailSender.SendAsync(message.Email, subject, body, context.CancellationToken);
    }
}
