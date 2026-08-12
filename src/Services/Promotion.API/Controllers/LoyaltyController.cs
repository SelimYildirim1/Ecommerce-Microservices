using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Promotion.API.Data;
using Promotion.API.Entities;

namespace Promotion.API.Controllers;

[Route("api/loyalty")]
[ApiController]
public class LoyaltyController : ControllerBase
{
    private readonly PromotionDbContext _context;

    public LoyaltyController(PromotionDbContext context) => _context = context;

    [HttpGet("{userId}")]
    public async Task<ActionResult<LoyaltyAccountDto>> GetAccount(string userId)
    {
        var account = await _context.LoyaltyAccounts
            .Include(a => a.Transactions)
            .FirstOrDefaultAsync(a => a.UserId == userId);

        if (account is null)
            return Ok(new LoyaltyAccountDto(userId, 0, null, new List<LoyaltyTransactionDto>()));

        var transactions = account.Transactions
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .Select(t => new LoyaltyTransactionDto(
                t.Id, t.Type.ToString(), t.Points, t.Description, t.OrderId, t.CreatedAt))
            .ToList();

        return Ok(new LoyaltyAccountDto(
            account.UserId, account.Points, account.LastEarnedAt, transactions));
    }

    [HttpPost("redeem")]
    public async Task<IActionResult> Redeem([FromBody] RedeemPointsRequest request)
    {
        if (request.Points <= 0)
            return BadRequest("Geçersiz puan miktarı.");

        var account = await _context.LoyaltyAccounts
            .FirstOrDefaultAsync(a => a.UserId == request.UserId);

        if (account is null || account.Points < request.Points)
            return BadRequest("Yetersiz puan.");

        account.Points -= request.Points;

        _context.LoyaltyTransactions.Add(new LoyaltyTransaction
        {
            LoyaltyAccountId = account.Id,
            Type = LoyaltyTransactionType.Redeem,
            Points = request.Points,
            Description = "Puan kullanımı"
        });

        await _context.SaveChangesAsync();

        return Ok(new { account.UserId, account.Points, redeemed = request.Points });
    }

    [HttpGet("/api/coupons/user/{userId}")]
    public async Task<ActionResult<List<UserCouponDto>>> GetUserCoupons(string userId)
    {
        var usages = await _context.CouponUsages
            .Include(u => u.Coupon)
            .Where(u => u.UserName == userId)
            .OrderByDescending(u => u.UsedAt)
            .ToListAsync();

        var usedCouponIds = usages.Select(u => u.CouponId).Distinct().ToHashSet();

        var now = DateTime.UtcNow;
        var availableCoupons = await _context.Coupons
            .AsNoTracking()
            .Where(c => c.IsActive && c.ValidFrom <= now && c.ValidTo >= now && !usedCouponIds.Contains(c.Id))
            .ToListAsync();

        var result = new List<UserCouponDto>();

        foreach (var c in availableCoupons)
        {
            if (c.UsageLimit > 0 && c.UsedCount >= c.UsageLimit) continue;
            result.Add(new UserCouponDto(c.Id, c.Code, c.Description, c.DiscountType.ToString(), c.Value, c.MinBasketAmount, c.ValidTo, false));
        }

        foreach (var u in usages)
        {
            result.Add(new UserCouponDto(u.Coupon.Id, u.Coupon.Code, u.Coupon.Description, u.Coupon.DiscountType.ToString(), u.Coupon.Value, u.Coupon.MinBasketAmount, u.Coupon.ValidTo, true));
        }

        return Ok(result);
    }
}

public record LoyaltyAccountDto(string UserId, int Points, DateTime? LastEarnedAt, List<LoyaltyTransactionDto> Transactions);
public record LoyaltyTransactionDto(Guid Id, string Type, int Points, string? Description, Guid? OrderId, DateTime CreatedAt);
public record RedeemPointsRequest(string UserId, int Points);
public record UserCouponDto(Guid Id, string Code, string? Description, string DiscountType, decimal Value, decimal MinBasketAmount, DateTime ValidTo, bool Used);
