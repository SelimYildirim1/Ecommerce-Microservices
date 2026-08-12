using MassTransit;
using Core.Shared.Events;
using Notification.API.Services;

namespace Notification.API.Consumers;

public class PaymentSucceededConsumer : IConsumer<PaymentSucceededEvent>
{
    private readonly IEmailSender _emailSender;
    private readonly IEmailTemplateService _templates;
    private readonly ILogger<PaymentSucceededConsumer> _logger;

    public PaymentSucceededConsumer(
        IEmailSender emailSender,
        IEmailTemplateService templates,
        ILogger<PaymentSucceededConsumer> logger)
    {
        _emailSender = emailSender;
        _templates = templates;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<PaymentSucceededEvent> context)
    {
        var message = context.Message;

        _logger.LogInformation(
            "Ödeme başarılı bildirimi hazırlanıyor. OrderId={OrderId}, Alıcı={Email}",
            message.OrderId, message.Email);

        var vars = new Dictionary<string, string?>
        {
            ["OrderId"] = message.OrderId.ToString(),
            ["OrderNumber"] = message.OrderNumber
        };

        var rendered = await _templates.TryRenderAsync("PaymentSucceeded", vars, context.CancellationToken);
        var (subject, body) = rendered ?? EmailTemplates.PaymentSucceeded(message.OrderId, message.OrderNumber);

        await _emailSender.SendAsync(message.Email, subject, body, context.CancellationToken);
    }
}
