using Identity.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using MassTransit;
using Core.Shared.Events;

namespace Identity.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IConfiguration _configuration;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IHostEnvironment _env;

    public AuthController(UserManager<ApplicationUser> userManager,
                          SignInManager<ApplicationUser> signInManager,
                          RoleManager<IdentityRole> roleManager,
                          IConfiguration configuration,
                          IPublishEndpoint publishEndpoint,
                          IHostEnvironment env)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _configuration = configuration;
        _publishEndpoint = publishEndpoint;
        _env = env;
    }

    // Admin: Tüm kullanıcıları getirir (Aggregator tarafından kullanılır)
    [HttpGet("users")]
    [Authorize(Roles = IdentityRoles.Admin)]
    public async Task<ActionResult<List<UserListDto>>> GetAllUsers([FromQuery] string? search)
    {
        var query = _userManager.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u =>
                u.UserName!.ToLower().Contains(term) ||
                u.Email!.ToLower().Contains(term) ||
                u.FirstName.ToLower().Contains(term) ||
                u.LastName.ToLower().Contains(term));
        }

        var users = await query
            .Select(u => new
            {
                u.Id,
                u.UserName,
                u.Email,
                u.FirstName,
                u.LastName,
                u.PhoneNumber,
                u.CreatedAt,
                u.LockoutEnd,
                AddressCount = u.Addresses.Count
            })
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var result = new List<UserListDto>();

        foreach (var u in users)
        {
            var user = await _userManager.FindByIdAsync(u.Id);
            var roles = user is null
                ? new List<string>()
                : (await _userManager.GetRolesAsync(user)).ToList();

            result.Add(new UserListDto
            {
                Id = u.Id,
                UserName = u.UserName!,
                Email = u.Email!,
                FirstName = u.FirstName,
                LastName = u.LastName,
                PhoneNumber = u.PhoneNumber,
                CreatedAt = u.CreatedAt,
                IsBlocked = u.LockoutEnd.HasValue && u.LockoutEnd > DateTimeOffset.UtcNow,
                Roles = roles,
                AddressCount = u.AddressCount
            });
        }

        return Ok(result);
    }

    /// <summary>Admin: musteri detayi, rolleri ve adres defteri.</summary>
    [HttpGet("users/{userId}")]
    [Authorize(Roles = IdentityRoles.Admin)]
    public async Task<ActionResult<UserDetailDto>> GetUserDetail(string userId)
    {
        var user = await _userManager.Users
            .Include(u => u.Addresses)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return NotFound("Kullanıcı bulunamadı.");

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new UserDetailDto
        {
            Id = user.Id,
            UserName = user.UserName!,
            Email = user.Email!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            PhoneNumber = user.PhoneNumber,
            CreatedAt = user.CreatedAt,
            IsBlocked = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow,
            Roles = roles.ToList(),
            AddressCount = user.Addresses.Count,
            EmailConfirmed = user.EmailConfirmed,
            LockoutEnd = user.LockoutEnd?.UtcDateTime,
            Addresses = user.Addresses.Select(AddressesController.Map).ToList()
        });
    }

    /// <summary>Admin: hesabi engeller veya engeli kaldirir.</summary>
    [HttpPut("users/{userId}/block")]
    [Authorize(Roles = IdentityRoles.Admin)]
    public async Task<IActionResult> SetBlocked(string userId, [FromBody] BlockUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound("Kullanıcı bulunamadı.");

        if (await _userManager.IsInRoleAsync(user, IdentityRoles.Admin) && request.Blocked)
            return BadRequest("Yönetici hesabı engellenemez.");

        await _userManager.SetLockoutEnabledAsync(user, true);

        var until = request.Blocked ? DateTimeOffset.UtcNow.AddYears(100) : (DateTimeOffset?)null;
        var result = await _userManager.SetLockoutEndDateAsync(user, until);

        if (!result.Succeeded) return BadRequest(result.Errors);

        return Ok(new { userId, blocked = request.Blocked });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        // 1. Kullanıcıyı bul
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) return Unauthorized("Kullanıcı bulunamadı.");

        // 2. Şifreyi kontrol et
        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (result.IsLockedOut) return Unauthorized("Hesabınız geçici olarak kilitlendi. Lütfen daha sonra deneyin.");
        if (result.IsNotAllowed) return Unauthorized("E-posta adresiniz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.");
        if (!result.Succeeded) return Unauthorized("Şifre hatalı.");

        // 3. Token üret ve gönder
        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);

        return Ok(new AuthResponse
        {
            Email = user.Email,
            UserName = user.UserName,
            Token = token,
            Roles = roles.ToList()
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        // 1. Kullanıcı var mı kontrol et
        var userExists = await _userManager.FindByEmailAsync(request.Email);
        if (userExists != null) return BadRequest("Bu email zaten kayıtlı.");

        // 2. Yeni kullanıcı oluştur
        var user = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.UserName,
            FirstName = request.FirstName,
            LastName = request.LastName,
            EmailConfirmed = false
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded) return BadRequest(result.Errors);

        // Yeni kayitlar varsayilan olarak Customer rolune girer
        if (await _roleManager.RoleExistsAsync(IdentityRoles.Customer))
            await _userManager.AddToRoleAsync(user, IdentityRoles.Customer);

        await SendConfirmEmailAsync(user);

        // Production: e-posta doğrulanmadan JWT verilmez (RequireConfirmedEmail)
        if (_userManager.Options.SignIn.RequireConfirmedEmail)
        {
            return Ok(new
            {
                requiresEmailConfirmation = true,
                email = user.Email,
                message = "Kayıt başarılı. Giriş yapmadan önce e-posta adresinizi doğrulayın."
            });
        }

        // Development: geriye dönük — token dönülür
        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);

        return Ok(new AuthResponse
        {
            Email = user.Email,
            UserName = user.UserName,
            Token = token,
            Roles = roles.ToList()
        });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        // Enumeration önlemek için her zaman aynı mesaj
        const string msg = "Eğer bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi.";

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null) return Ok(new { message = msg });

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encoded = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        var front = _configuration["App:FrontendBaseUrl"] ?? "http://localhost:3000";
        var link = $"{front.TrimEnd('/')}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={encoded}";

        await _publishEndpoint.Publish(new AccountEmailEvent
        {
            Email = user.Email!,
            Subject = "Şifre sıfırlama",
            HtmlBody = BuildSimpleEmail(
                "Şifrenizi sıfırlayın",
                $"<p>Şifre sıfırlama talebinde bulundunuz.</p><p><a href=\"{HtmlEncoder.Default.Encode(link)}\">Şifremi sıfırla</a></p><p style=\"font-size:12px;word-break:break-all\">{HtmlEncoder.Default.Encode(link)}</p>")
        });

        return Ok(new { message = msg });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null) return BadRequest("Geçersiz istek.");

        string token;
        try
        {
            token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Token));
        }
        catch
        {
            return BadRequest("Geçersiz veya süresi dolmuş token.");
        }

        var result = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);
        if (!result.Succeeded) return BadRequest(result.Errors);

        return Ok(new { message = "Şifreniz güncellendi. Giriş yapabilirsiniz." });
    }

    [HttpGet("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] string userId, [FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(token))
            return BadRequest("Eksik parametre.");

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return BadRequest("Geçersiz istek.");

        string decoded;
        try
        {
            decoded = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
        }
        catch
        {
            return BadRequest("Geçersiz token.");
        }

        var result = await _userManager.ConfirmEmailAsync(user, decoded);
        if (!result.Succeeded) return BadRequest(result.Errors);

        return Ok(new { message = "E-posta doğrulandı. Giriş yapabilirsiniz." });
    }

    [HttpPost("confirm-email")]
    public Task<IActionResult> ConfirmEmailPost([FromBody] ConfirmEmailRequest request)
        => ConfirmEmail(request.UserId, request.Token);

    [HttpPost("resend-confirmation")]
    public async Task<IActionResult> ResendConfirmation([FromBody] ResendConfirmationRequest request)
    {
        const string msg = "Eğer hesap doğrulanmamışsa yeni bir doğrulama e-postası gönderildi.";
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || user.EmailConfirmed) return Ok(new { message = msg });

        await SendConfirmEmailAsync(user);
        return Ok(new { message = msg });
    }

    [HttpPost("refresh")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> Refresh()
    {
        var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                     ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        if (_userManager.Options.SignIn.RequireConfirmedEmail && !user.EmailConfirmed)
            return Unauthorized("E-posta doğrulanmamış.");

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);
        return Ok(new AuthResponse
        {
            Email = user.Email,
            UserName = user.UserName,
            Token = token,
            Roles = roles.ToList()
        });
    }

    // --- ROL YONETIMI (sadece Admin) ---

    [HttpGet("roles")]
    [Authorize(Roles = IdentityRoles.Admin)]
    public ActionResult<List<string>> GetRoles()
        => Ok(_roleManager.Roles.Select(r => r.Name!).ToList());

    [HttpGet("users/{userId}/roles")]
    [Authorize(Roles = IdentityRoles.Admin)]
    public async Task<ActionResult<List<string>>> GetUserRoles(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound("Kullanıcı bulunamadı.");

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(roles.ToList());
    }

    [HttpPost("users/{userId}/roles")]
    [Authorize(Roles = IdentityRoles.Admin)]
    public async Task<IActionResult> AssignRole(string userId, [FromBody] AssignRoleRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound("Kullanıcı bulunamadı.");

        if (!await _roleManager.RoleExistsAsync(request.Role))
            return BadRequest($"'{request.Role}' rolü bulunamadı.");

        if (await _userManager.IsInRoleAsync(user, request.Role))
            return BadRequest("Kullanıcı zaten bu role sahip.");

        var result = await _userManager.AddToRoleAsync(user, request.Role);
        if (!result.Succeeded) return BadRequest(result.Errors);

        return Ok(new { userId, request.Role });
    }

    [HttpDelete("users/{userId}/roles/{role}")]
    [Authorize(Roles = IdentityRoles.Admin)]
    public async Task<IActionResult> RemoveRole(string userId, string role)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound("Kullanıcı bulunamadı.");

        var result = await _userManager.RemoveFromRoleAsync(user, role);
        if (!result.Succeeded) return BadRequest(result.Errors);

        return NoContent();
    }

    /// <summary>Gecerli token'in sahibini dondurur; panelin oturum dogrulamasi icin.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> Me()
    {
        var userId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                     ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);

        return Ok(new AuthResponse
        {
            Email = user.Email,
            UserName = user.UserName,
            Token = string.Empty,
            Roles = roles.ToList()
        });
    }

    // --- JWT TOKEN ÜRETME MOTORU ---
    private string GenerateJwtToken(ApplicationUser user, IList<string> roles)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings.GetValue<string>("Secret");

        // Token'ın içine gömeceğimiz bilgiler (Claims)
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id), // Kullanıcı ID
            new Claim(JwtRegisteredClaimNames.Email, user.Email), // Email
            new Claim(JwtRegisteredClaimNames.GivenName, user.UserName), // Kullanıcı Adı
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()) // Token ID
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        // İmzalama Anahtarı
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Token oluşturma
        var token = new JwtSecurityToken(
            issuer: jwtSettings.GetValue<string>("Issuer"),
            audience: jwtSettings.GetValue<string>("Audience"),
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(jwtSettings.GetValue<double>("DurationInMinutes")),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task SendConfirmEmailAsync(ApplicationUser user)
    {
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var encoded = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        var front = _configuration["App:FrontendBaseUrl"] ?? "http://localhost:3000";
        var link =
            $"{front.TrimEnd('/')}/confirm-email?userId={Uri.EscapeDataString(user.Id)}&token={encoded}";

        await _publishEndpoint.Publish(new AccountEmailEvent
        {
            Email = user.Email!,
            Subject = "E-posta adresinizi doğrulayın",
            HtmlBody = BuildSimpleEmail(
                "E-posta doğrulama",
                $"<p>Hesabınızı aktifleştirmek için bağlantıya tıklayın.</p><p><a href=\"{HtmlEncoder.Default.Encode(link)}\">E-postamı doğrula</a></p><p style=\"font-size:12px;word-break:break-all\">{HtmlEncoder.Default.Encode(link)}</p>")
        });
    }

    private static string BuildSimpleEmail(string heading, string content) =>
        $@"<!DOCTYPE html><html lang=""tr""><body style=""font-family:sans-serif;padding:24px""><h1>{heading}</h1>{content}<p style=""color:#888;font-size:12px"">Yıldırım Store</p></body></html>";
}
