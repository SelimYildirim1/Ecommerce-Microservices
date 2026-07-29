using Identity.API.Data;
using Identity.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Identity.API.Controllers;

/// <summary>
/// Kullanicinin adres defteri. Oturum acan kullanici yalnizca kendi
/// adreslerini gorur ve yonetir.
/// </summary>
[Route("api/auth/addresses")]
[ApiController]
[Authorize]
public class AddressesController : ControllerBase
{
    private readonly AppIdentityDbContext _context;

    public AddressesController(AppIdentityDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserAddressDto>>> GetMine()
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var addresses = await _context.UserAddresses
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault)
            .ThenBy(a => a.AddressTitle)
            .ToListAsync();

        return Ok(addresses.Select(Map).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<UserAddressDto>> Create([FromBody] SaveUserAddressRequest request)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var address = new UserAddress { UserId = userId };
        Apply(address, request);

        // Ilk adres otomatik varsayilan olur
        var hasAny = await _context.UserAddresses.AnyAsync(a => a.UserId == userId);
        if (!hasAny) address.IsDefault = true;

        if (address.IsDefault) await ClearDefaults(userId);

        _context.UserAddresses.Add(address);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMine), Map(address));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserAddressDto>> Update(int id, [FromBody] SaveUserAddressRequest request)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var address = await _context.UserAddresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (address is null) return NotFound("Adres bulunamadı.");

        if (request.IsDefault && !address.IsDefault) await ClearDefaults(userId);

        Apply(address, request);
        await _context.SaveChangesAsync();

        return Ok(Map(address));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var address = await _context.UserAddresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (address is null) return NotFound();

        _context.UserAddresses.Remove(address);
        await _context.SaveChangesAsync();

        // Varsayilan adres silindiyse kalanlardan biri varsayilan yapilir
        if (address.IsDefault)
        {
            var next = await _context.UserAddresses
                .FirstOrDefaultAsync(a => a.UserId == userId);

            if (next is not null)
            {
                next.IsDefault = true;
                await _context.SaveChangesAsync();
            }
        }

        return NoContent();
    }

    [HttpPut("{id:int}/default")]
    public async Task<IActionResult> SetDefault(int id)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized();

        var address = await _context.UserAddresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (address is null) return NotFound();

        await ClearDefaults(userId);
        address.IsDefault = true;
        await _context.SaveChangesAsync();

        return Ok(Map(address));
    }

    private async Task ClearDefaults(string userId)
    {
        var current = await _context.UserAddresses
            .Where(a => a.UserId == userId && a.IsDefault)
            .ToListAsync();

        foreach (var item in current) item.IsDefault = false;
    }

    private string? CurrentUserId() =>
        User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

    private static void Apply(UserAddress address, SaveUserAddressRequest r)
    {
        address.AddressTitle = r.AddressTitle.Trim();
        address.RecipientName = r.RecipientName.Trim();
        address.Street = r.Street.Trim();
        address.City = r.City.Trim();
        address.District = r.District.Trim();
        address.ZipCode = r.ZipCode?.Trim() ?? string.Empty;
        address.Country = string.IsNullOrWhiteSpace(r.Country) ? "Türkiye" : r.Country.Trim();
        address.PhoneNumber = r.PhoneNumber.Trim();
        address.IsDefault = r.IsDefault;
    }

    internal static UserAddressDto Map(UserAddress a) => new()
    {
        Id = a.Id,
        AddressTitle = a.AddressTitle,
        RecipientName = a.RecipientName,
        Street = a.Street,
        City = a.City,
        District = a.District,
        ZipCode = a.ZipCode,
        Country = a.Country,
        PhoneNumber = a.PhoneNumber,
        IsDefault = a.IsDefault
    };
}
