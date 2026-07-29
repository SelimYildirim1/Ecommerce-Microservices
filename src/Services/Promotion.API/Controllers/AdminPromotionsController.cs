using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Promotion.API.Data;
using Promotion.API.Entities;
using Promotion.API.Models;

namespace Promotion.API.Controllers;

[Route("api/admin/coupons")]
[ApiController]
public class AdminCouponsController : ControllerBase
{
    private readonly PromotionDbContext _context;

    public AdminCouponsController(PromotionDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<CouponDto>>> GetAll()
    {
        var coupons = await _context.Coupons
            .AsNoTracking()
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Ok(coupons.Select(Map).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CouponDto>> GetById(Guid id)
    {
        var coupon = await _context.Coupons.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (coupon is null) return NotFound();
        return Ok(Map(coupon));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveCouponRequest request)
    {
        var code = request.Code.Trim().ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(code)) return BadRequest("Kupon kodu zorunludur.");

        if (await _context.Coupons.AnyAsync(c => c.Code.ToUpper() == code))
            return BadRequest("Bu kupon kodu zaten kullanılıyor.");

        var coupon = new Coupon { Code = code };
        Apply(coupon, request);

        _context.Coupons.Add(coupon);
        await _context.SaveChangesAsync();

        return Ok(new { coupon.Id, coupon.Code });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveCouponRequest request)
    {
        var coupon = await _context.Coupons.FindAsync(id);
        if (coupon is null) return NotFound();

        var code = request.Code.Trim().ToUpperInvariant();

        if (await _context.Coupons.AnyAsync(c => c.Id != id && c.Code.ToUpper() == code))
            return BadRequest("Bu kupon kodu zaten kullanılıyor.");

        coupon.Code = code;
        Apply(coupon, request);
        coupon.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { coupon.Id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var coupon = await _context.Coupons.FindAsync(id);
        if (coupon is null) return NotFound();

        // Kullanilmis kuponlar gecmis kayit oldugu icin silinmez, pasife alinir
        if (coupon.UsedCount > 0)
        {
            coupon.IsActive = false;
            coupon.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { coupon.Id, deactivated = true });
        }

        _context.Coupons.Remove(coupon);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static void Apply(Coupon coupon, SaveCouponRequest r)
    {
        coupon.Description = r.Description;
        coupon.DiscountType = r.DiscountType;
        coupon.Value = r.Value;
        coupon.MinBasketAmount = r.MinBasketAmount;
        coupon.MaxDiscountAmount = r.MaxDiscountAmount;
        coupon.UsageLimit = r.UsageLimit;
        coupon.PerUserLimit = r.PerUserLimit;
        coupon.ValidFrom = DateTime.SpecifyKind(r.ValidFrom, DateTimeKind.Utc);
        coupon.ValidTo = DateTime.SpecifyKind(r.ValidTo, DateTimeKind.Utc);
        coupon.IsActive = r.IsActive;
        coupon.CategoryIds = r.CategoryIds;
        coupon.ProductIds = r.ProductIds;
    }

    private static CouponDto Map(Coupon c) => new(
        c.Id, c.Code, c.Description, c.DiscountType, c.Value, c.MinBasketAmount,
        c.MaxDiscountAmount, c.UsageLimit, c.PerUserLimit, c.UsedCount,
        c.ValidFrom, c.ValidTo, c.IsActive, c.CategoryIds, c.ProductIds);
}

[Route("api/admin/campaigns")]
[ApiController]
public class AdminCampaignsController : ControllerBase
{
    private readonly PromotionDbContext _context;

    public AdminCampaignsController(PromotionDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<CampaignDto>>> GetAll()
    {
        var campaigns = await _context.Campaigns
            .AsNoTracking()
            .OrderByDescending(c => c.Priority)
            .ThenByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Ok(campaigns.Select(Map).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveCampaignRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Kampanya adı zorunludur.");

        var campaign = new Campaign();
        Apply(campaign, request);

        _context.Campaigns.Add(campaign);
        await _context.SaveChangesAsync();

        return Ok(new { campaign.Id, campaign.Name });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveCampaignRequest request)
    {
        var campaign = await _context.Campaigns.FindAsync(id);
        if (campaign is null) return NotFound();

        Apply(campaign, request);
        campaign.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { campaign.Id });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var campaign = await _context.Campaigns.FindAsync(id);
        if (campaign is null) return NotFound();

        _context.Campaigns.Remove(campaign);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static void Apply(Campaign c, SaveCampaignRequest r)
    {
        c.Name = r.Name;
        c.Description = r.Description;
        c.DiscountType = r.DiscountType;
        c.Value = r.Value;
        c.MinBasketAmount = r.MinBasketAmount;
        c.MaxDiscountAmount = r.MaxDiscountAmount;
        c.ValidFrom = DateTime.SpecifyKind(r.ValidFrom, DateTimeKind.Utc);
        c.ValidTo = DateTime.SpecifyKind(r.ValidTo, DateTimeKind.Utc);
        c.IsActive = r.IsActive;
        c.CategoryIds = r.CategoryIds;
        c.ProductIds = r.ProductIds;
        c.Priority = r.Priority;
    }

    private static CampaignDto Map(Campaign c) => new(
        c.Id, c.Name, c.Description, c.DiscountType, c.Value, c.MinBasketAmount,
        c.MaxDiscountAmount, c.ValidFrom, c.ValidTo, c.IsActive,
        c.CategoryIds, c.ProductIds, c.Priority);
}
