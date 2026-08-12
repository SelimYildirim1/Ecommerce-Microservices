using MassTransit;
using Core.Shared.Events;
using Notification.API.Services;

namespace Notification.API.Consumers;

public class AccountEmailConsumer : IConsumer<AccountEmailEvent>
{
    private readonly IEmailSender _emailSender;
    private readonly ILogger<AccountEmailConsumer> _logger;

    public AccountEmailConsumer(IEmailSender emailSender, ILogger<AccountEmailConsumer> logger)
    {
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<AccountEmailEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("AccountEmailEvent -> {Email} / {Subject}", msg.Email, msg.Subject);
        await _emailSender.SendAsync(msg.Email, msg.Subject, msg.HtmlBody);
    }
}

public class OrderShippedConsumer : IConsumer<OrderShippedEvent>
{
    private readonly IEmailSender _emailSender;
    private readonly IEmailTemplateService _templates;
    private readonly ILogger<OrderShippedConsumer> _logger;

    public OrderShippedConsumer(
        IEmailSender emailSender,
        IEmailTemplateService templates,
        ILogger<OrderShippedConsumer> logger)
    {
        _emailSender = emailSender;
        _templates = templates;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderShippedEvent> context)
    {
        var msg = context.Message;
        if (string.IsNullOrWhiteSpace(msg.Email)) return;

        var vars = new Dictionary<string, string?>
        {
            ["OrderId"] = msg.OrderId.ToString(),
            ["OrderNumber"] = msg.OrderNumber,
            ["TrackingNumber"] = msg.TrackingNumber
        };

        var rendered = await _templates.TryRenderAsync("OrderShipped", vars, context.CancellationToken);
        var (subject, body) = rendered ?? EmailTemplates.OrderShipped(msg.OrderId, msg.TrackingNumber, msg.OrderNumber);

        _logger.LogInformation("OrderShippedEvent -> {Email} OrderId={OrderId} OrderNumber={OrderNumber}",
            msg.Email, msg.OrderId, msg.OrderNumber);
        await _emailSender.SendAsync(msg.Email, subject, body);
    }
}
