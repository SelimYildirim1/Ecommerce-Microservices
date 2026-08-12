using Core.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Promotion.API.Data;
using Promotion.API.Entities;

namespace Promotion.API.Consumers;

public class OrderCreatedConsumer : IConsumer<OrderCreatedEvent>
{
    private readonly PromotionDbContext _context;
    private readonly ILogger<OrderCreatedConsumer> _logger;
    private readonly IConfiguration _configuration;

    public OrderCreatedConsumer(
        PromotionDbContext context,
        ILogger<OrderCreatedConsumer> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task Consume(ConsumeContext<OrderCreatedEvent> context)
    {
        var msg = context.Message;

        if (string.IsNullOrWhiteSpace(msg.BuyerId) || msg.BuyerId.StartsWith("guest-"))
        {
            _logger.LogInformation("Misafir sipariş; puan kazandırılmadı. BuyerId={BuyerId}", msg.BuyerId);
            return;
        }

        var earnRate = _configuration.GetValue<decimal>("Loyalty:EarnRate", 0.01m);
        var points = (int)Math.Floor(msg.TotalPrice * earnRate);
        if (points <= 0) return;

        var account = await _context.LoyaltyAccounts
            .FirstOrDefaultAsync(a => a.UserId == msg.BuyerId);

        if (account is null)
        {
            account = new LoyaltyAccount { UserId = msg.BuyerId };
            _context.LoyaltyAccounts.Add(account);
        }

        account.Points += points;
        account.LastEarnedAt = DateTime.UtcNow;

        _context.LoyaltyTransactions.Add(new LoyaltyTransaction
        {
            LoyaltyAccountId = account.Id,
            Type = LoyaltyTransactionType.Earn,
            Points = points,
            OrderId = msg.OrderId,
            Description = $"Sipariş #{msg.OrderNumber ?? msg.OrderId.ToString()[..8]}"
        });

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Puan kazandırıldı. UserId={UserId}, Points={Points}, Total={Total}",
            msg.BuyerId, points, account.Points);
    }
}
