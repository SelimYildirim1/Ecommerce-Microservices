using Identity.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Identity.API.Controllers;

/// <summary>
/// Musterinin kendi profili. Mevcut /api/auth/me ucu degismez;
/// bu controller yalnizca yeni okuma/guncelleme yollarini ekler.
/// </summary>
[Route("api/auth/profile")]
[ApiController]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(
        UserManager<ApplicationUser> userManager,
        ILogger<ProfileController> logger)
    {
        _userManager = userManager;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ProfileDto>> Get()
    {
        var user = await CurrentUser();
        if (user is null) return Unauthorized();

        return Ok(await MapAsync(user));
    }

    [HttpPut]
    public async Task<ActionResult<ProfileDto>> Update([FromBody] UpdateProfileRequest request)
    {
        var user = await CurrentUser();
        if (user is null) return Unauthorized();

        if (request.FirstName is not null) user.FirstName = request.FirstName.Trim();
        if (request.LastName is not null) user.LastName = request.LastName.Trim();
        if (request.PhoneNumber is not null) user.PhoneNumber = request.PhoneNumber.Trim();

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return Ok(await MapAsync(user));
    }

    /// <summary>
    /// Sifre degistirme. Token icindeki isim/e-posta degismedigi icin
    /// mevcut oturum gecerliligini korur.
    /// </summary>
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var user = await CurrentUser();
        if (user is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            return BadRequest(new[] { "Yeni şifre en az 6 karakter olmalı." });

        var result = await _userManager.ChangePasswordAsync(
            user, request.CurrentPassword ?? string.Empty, request.NewPassword);

        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        _logger.LogInformation("Şifre değiştirildi: {UserId}", user.Id);

        return Ok(new { message = "Şifreniz güncellendi." });
    }

    private async Task<ApplicationUser?> CurrentUser()
    {
        var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                     ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        return userId is null ? null : await _userManager.FindByIdAsync(userId);
    }

    private async Task<ProfileDto> MapAsync(ApplicationUser user) => new()
    {
        Id = user.Id,
        UserName = user.UserName ?? string.Empty,
        Email = user.Email ?? string.Empty,
        FirstName = user.FirstName,
        LastName = user.LastName,
        PhoneNumber = user.PhoneNumber,
        CreatedAt = user.CreatedAt,
        Roles = (await _userManager.GetRolesAsync(user)).ToList()
    };
}
