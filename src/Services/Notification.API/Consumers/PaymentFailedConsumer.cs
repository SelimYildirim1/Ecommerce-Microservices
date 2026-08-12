using MassTransit;
using Core.Shared.Events;
using Notification.API.Services;

namespace Notification.API.Consumers;

public class PaymentFailedConsumer : IConsumer<PaymentFailedEvent>
{
    private readonly IEmailSender _emailSender;
    private readonly IEmailTemplateService _templates;
    private readonly ILogger<PaymentFailedConsumer> _logger;

    public PaymentFailedConsumer(
        IEmailSender emailSender,
        IEmailTemplateService templates,
        ILogger<PaymentFailedConsumer> logger)
    {
        _emailSender = emailSender;
        _templates = templates;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentFailedEvent> context)
    {
        var message = context.Message;

        _logger.LogWarning(
            "Ödeme başarısız bildirimi hazırlanıyor. OrderId={OrderId}, Sebep={Reason}",
            message.OrderId, message.Reason);

        var vars = new Dictionary<string, string?>
        {
            ["OrderId"] = message.OrderId.ToString(),
            ["OrderNumber"] = message.OrderNumber,
            ["Reason"] = message.Reason
        };

        var rendered = await _templates.TryRenderAsync("PaymentFailed", vars, context.CancellationToken);
        var (subject, body) = rendered ?? EmailTemplates.PaymentFailed(message.OrderId, message.Reason, message.OrderNumber);

        await _emailSender.SendAsync(message.Email, subject, body, context.CancellationToken);
    }
}
