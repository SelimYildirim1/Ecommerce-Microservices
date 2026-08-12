using Identity.API.Data;
using Identity.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Identity.API.Controllers;

[Route("api/auth")]
[ApiController]
[Authorize]
public class AccountPrivacyController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppIdentityDbContext _dbContext;

    public AccountPrivacyController(
        UserManager<ApplicationUser> userManager,
        AppIdentityDbContext dbContext)
    {
        _userManager = userManager;
        _dbContext = dbContext;
    }

    [HttpGet("notification-preferences")]
    public async Task<ActionResult<NotificationPreferenceDto>> GetPreferences()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var pref = await _dbContext.NotificationPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        return Ok(pref is null
            ? new NotificationPreferenceDto()
            : new NotificationPreferenceDto
            {
                OrderUpdates = pref.OrderUpdates,
                Campaigns = pref.Campaigns,
                Newsletter = pref.Newsletter,
                Sms = pref.Sms,
                StockAlerts = pref.StockAlerts,
                PriceDrops = pref.PriceDrops
            });
    }

    [HttpPut("notification-preferences")]
    public async Task<ActionResult<NotificationPreferenceDto>> UpdatePreferences([FromBody] NotificationPreferenceDto dto)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var pref = await _dbContext.NotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (pref is null)
        {
            pref = new NotificationPreference { UserId = userId };
            _dbContext.NotificationPreferences.Add(pref);
        }

        pref.OrderUpdates = dto.OrderUpdates;
        pref.Campaigns = dto.Campaigns;
        pref.Newsletter = dto.Newsletter;
        pref.Sms = dto.Sms;
        pref.StockAlerts = dto.StockAlerts;
        pref.PriceDrops = dto.PriceDrops;

        await _dbContext.SaveChangesAsync();

        return Ok(dto);
    }

    [HttpGet("export-data")]
    public async Task<ActionResult<ExportDataDto>> ExportData()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var user = await _userManager.Users
            .Include(u => u.Addresses)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);

        var pref = await _dbContext.NotificationPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        return Ok(new ExportDataDto
        {
            Profile = new ProfileDto
            {
                Id = user.Id,
                UserName = user.UserName ?? "",
                Email = user.Email ?? "",
                FirstName = user.FirstName,
                LastName = user.LastName,
                PhoneNumber = user.PhoneNumber,
                CreatedAt = user.CreatedAt,
                Roles = roles.ToList()
            },
            Addresses = user.Addresses.Select(AddressesController.Map).ToList(),
            Preferences = pref is null
                ? new NotificationPreferenceDto()
                : new NotificationPreferenceDto
                {
                    OrderUpdates = pref.OrderUpdates,
                    Campaigns = pref.Campaigns,
                    Newsletter = pref.Newsletter,
                    Sms = pref.Sms,
                    StockAlerts = pref.StockAlerts,
                    PriceDrops = pref.PriceDrops
                }
        });
    }

    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        if (await _userManager.IsInRoleAsync(user, IdentityRoles.Admin))
            return BadRequest("Yönetici hesabı silinemez.");

        user.Email = $"deleted-{user.Id}@anonymized.local";
        user.NormalizedEmail = user.Email.ToUpperInvariant();
        user.UserName = $"deleted-{user.Id}";
        user.NormalizedUserName = user.UserName.ToUpperInvariant();
        user.FirstName = "";
        user.LastName = "";
        user.PhoneNumber = null;
        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;
        user.LockoutEnd = DateTimeOffset.UtcNow.AddYears(100);
        user.LockoutEnabled = true;
        user.SecurityStamp = Guid.NewGuid().ToString();

        await _userManager.UpdateAsync(user);

        var prefs = await _dbContext.NotificationPreferences
            .Where(p => p.UserId == userId).ToListAsync();
        _dbContext.NotificationPreferences.RemoveRange(prefs);

        var addrs = await _dbContext.UserAddresses
            .Where(a => a.UserId == userId).ToListAsync();
        _dbContext.UserAddresses.RemoveRange(addrs);

        await _dbContext.SaveChangesAsync();

        return Ok(new { message = "Hesabınız silindi." });
    }

    private string? GetUserId() =>
        User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
}
