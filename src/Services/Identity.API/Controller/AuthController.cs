using Identity.API.Data;
using Identity.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
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
    private readonly AppIdentityDbContext _dbContext;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AuthController> _logger;

    public AuthController(UserManager<ApplicationUser> userManager,
                          SignInManager<ApplicationUser> signInManager,
                          RoleManager<IdentityRole> roleManager,
                          IConfiguration configuration,
                          IPublishEndpoint publishEndpoint,
                          IHostEnvironment env,
                          AppIdentityDbContext dbContext,
                          IHttpClientFactory httpClientFactory,
                          ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _configuration = configuration;
        _publishEndpoint = publishEndpoint;
        _env = env;
        _dbContext = dbContext;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    // Admin: Tüm kullanıcıları getirir (Aggregator tarafından kullanılır)
    [HttpGet("users")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<object>> GetAllUsers(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

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

        var total = await query.CountAsync();

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
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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

        return Ok(new
        {
            items = result,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    /// <summary>Admin: musteri detayi, rolleri ve adres defteri.</summary>
    [HttpGet("users/{userId}")]
    [Authorize(Policy = "AdminOnly")]
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
    [Authorize(Policy = "AdminOnly")]
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

    /// <summary>
    /// Misafir oturumu: Identity kaydi olusturmaz. Sepet anahtari olarak
    /// sub=guest-{uuid} JWT doner (varsayilan 30 gun).
    /// </summary>
    [HttpPost("guest")]
    [AllowAnonymous]
    [EnableRateLimiting("guest")]
    public ActionResult<GuestAuthResponse> CreateGuestSession()
    {
        var guestId = $"guest-{Guid.NewGuid():N}";
        var token = GenerateGuestJwtToken(guestId);

        return Ok(new GuestAuthResponse
        {
            GuestId = guestId,
            Token = token,
            ExpiresInDays = 30
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        // 1. Kullanıcıyı bul
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) return Unauthorized("Kullanıcı bulunamadı.");
        if (user.IsDeleted) return Unauthorized("Bu hesap silinmiş.");

        // 2. Şifreyi kontrol et
        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (result.IsLockedOut) return Unauthorized("Hesabınız geçici olarak kilitlendi. Lütfen daha sonra deneyin.");
        if (result.IsNotAllowed) return Unauthorized("E-posta adresiniz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.");
        if (!result.Succeeded) return Unauthorized("Şifre hatalı.");

        // 3. Token üret ve gönder
        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles, request.RememberMe);

        return Ok(new AuthResponse
        {
            Email = user.Email,
            UserName = user.UserName,
            Token = token,
            Roles = roles.ToList()
        });
    }

    /// <summary>
    /// Google / Facebook id_token ile giriş. Anahtar yoksa 501.
    /// </summary>
    [HttpPost("external-login")]
    [EnableRateLimiting("auth-sensitive")]
    public async Task<ActionResult<AuthResponse>> ExternalLogin([FromBody] ExternalLoginRequest request)
    {
        var provider = (request.Provider ?? "").Trim().ToLowerInvariant();
        if (provider is not ("google" or "facebook"))
            return BadRequest("Desteklenen sağlayıcılar: google, facebook.");

        var googleClientId = _configuration["ExternalAuth:Google:ClientId"];
        var facebookAppId = _configuration["ExternalAuth:Facebook:AppId"];
        var facebookAppSecret = _configuration["ExternalAuth:Facebook:AppSecret"];

        if (provider == "google" && string.IsNullOrWhiteSpace(googleClientId))
            return StatusCode(501, "Google girişi yapılandırılmamış.");
        if (provider == "facebook" && (string.IsNullOrWhiteSpace(facebookAppId) || string.IsNullOrWhiteSpace(facebookAppSecret)))
            return StatusCode(501, "Facebook girişi yapılandırılmamış.");

        string? email;
        string? name;
        string? subject;

        try
        {
            if (provider == "google")
                (email, name, subject) = await VerifyGoogleTokenAsync(request.IdToken, googleClientId!);
            else
                (email, name, subject) = await VerifyFacebookTokenAsync(request.IdToken, facebookAppId!, facebookAppSecret!);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Harici token doğrulanamadı.");
            return Unauthorized("Harici kimlik doğrulama başarısız.");
        }

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(subject))
            return Unauthorized("E-posta alınamadı.");

        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
        {
            var parts = (name ?? email).Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            user = new ApplicationUser
            {
                Email = email,
                UserName = email,
                FirstName = parts.ElementAtOrDefault(0) ?? "Kullanıcı",
                LastName = parts.ElementAtOrDefault(1) ?? "",
                EmailConfirmed = true
            };
            var create = await _userManager.CreateAsync(user);
            if (!create.Succeeded) return BadRequest(create.Errors);

            if (await _roleManager.RoleExistsAsync(IdentityRoles.Customer))
                await _userManager.AddToRoleAsync(user, IdentityRoles.Customer);

            await _userManager.AddLoginAsync(user, new UserLoginInfo(provider, subject, provider));
        }
        else if (user.IsDeleted)
        {
            return Unauthorized("Bu hesap silinmiş.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles, rememberMe: true);
        return Ok(new AuthResponse
        {
            Email = user.Email,
            UserName = user.UserName,
            Token = token,
            Roles = roles.ToList()
        });
    }

    [HttpPost("otp/request")]
    [EnableRateLimiting("auth-sensitive")]
    public async Task<IActionResult> RequestOtp([FromBody] OtpRequest request)
    {
        var phone = NormalizePhone(request.PhoneNumber);
        if (phone.Length < 10) return BadRequest("Geçerli bir telefon numarası girin.");

        var code = Random.Shared.Next(100000, 999999).ToString();
        _dbContext.OtpCodes.Add(new OtpCode
        {
            PhoneNumber = phone,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5)
        });
        await _dbContext.SaveChangesAsync();

        // SMS sağlayıcı yoksa log'a yazılır (takılabilir)
        _logger.LogInformation("OTP kodu üretildi. Phone={Phone} Code={Code}", phone, code);

        await _publishEndpoint.Publish(new AccountEmailEvent
        {
            Email = $"sms+{phone}@otp.local",
            Subject = "OTP",
            HtmlBody = $"Telefon doğrulama kodu: {code}"
        });

        return Ok(new
        {
            message = "Doğrulama kodu gönderildi.",
            // Geliştirmede UI testi için
            debugCode = _env.IsDevelopment() ? code : null
        });
    }

    [HttpPost("otp/verify")]
    [EnableRateLimiting("auth-sensitive")]
    public async Task<ActionResult<AuthResponse>> VerifyOtp([FromBody] OtpVerifyRequest request)
    {
        var phone = NormalizePhone(request.PhoneNumber);
        var otp = await _dbContext.OtpCodes
            .Where(o => o.PhoneNumber == phone && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otp is null || otp.Code != request.Code.Trim())
            return Unauthorized("Geçersiz veya süresi dolmuş kod.");

        otp.IsUsed = true;

        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone && !u.IsDeleted);
        if (user is null)
        {
            var email = $"phone.{phone}@otp.local";
            user = new ApplicationUser
            {
                Email = email,
                UserName = phone,
                PhoneNumber = phone,
                PhoneNumberConfirmed = true,
                EmailConfirmed = true,
                FirstName = "Telefon",
                LastName = "Kullanıcısı"
            };
            var create = await _userManager.CreateAsync(user);
            if (!create.Succeeded) return BadRequest(create.Errors);
            if (await _roleManager.RoleExistsAsync(IdentityRoles.Customer))
                await _userManager.AddToRoleAsync(user, IdentityRoles.Customer);
        }

        otp.UserId = user.Id;
        await _dbContext.SaveChangesAsync();

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles, rememberMe: true);
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
        if (user is null || user.IsDeleted) return Unauthorized();

        if (_userManager.Options.SignIn.RequireConfirmedEmail && !user.EmailConfirmed)
            return Unauthorized("E-posta doğrulanmamış.");

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles, rememberMe: true);
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
    [Authorize(Policy = "AdminOnly")]
    public ActionResult<List<string>> GetRoles()
        => Ok(_roleManager.Roles.Select(r => r.Name!).OrderBy(n => n).ToList());

    [HttpGet("users/{userId}/roles")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<List<string>>> GetUserRoles(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound("Kullanıcı bulunamadı.");

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(roles.ToList());
    }

    [HttpPost("users/{userId}/roles")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> AssignRole(string userId, [FromBody] AssignRoleRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound("Kullanıcı bulunamadı.");

        var role = request.Role?.Trim() ?? "";
        if (string.Equals(role, IdentityRoles.Guest, StringComparison.OrdinalIgnoreCase))
            return BadRequest("Guest rolü atanamaz.");

        if (!await _roleManager.RoleExistsAsync(role))
            return BadRequest($"'{role}' rolü bulunamadı.");

        if (await _userManager.IsInRoleAsync(user, role))
            return BadRequest("Kullanıcı zaten bu role sahip.");

        var result = await _userManager.AddToRoleAsync(user, role);
        if (!result.Succeeded) return BadRequest(result.Errors);

        return Ok(new { userId, role });
    }

    [HttpDelete("users/{userId}/roles/{role}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> RemoveRole(string userId, string role)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound("Kullanıcı bulunamadı.");

        if (string.Equals(role, IdentityRoles.Admin, StringComparison.OrdinalIgnoreCase)
            && await _userManager.IsInRoleAsync(user, IdentityRoles.Admin))
        {
            var adminCount = 0;
            foreach (var admin in await _userManager.GetUsersInRoleAsync(IdentityRoles.Admin))
            {
                if (!admin.IsDeleted) adminCount++;
            }

            if (adminCount <= 1)
                return BadRequest("Son yönetici rolü kaldırılamaz.");
        }

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

    private string GenerateJwtToken(ApplicationUser user, IList<string> roles, bool rememberMe = false)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings.GetValue<string>("Secret");

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new Claim(JwtRegisteredClaimNames.GivenName, user.UserName ?? ""),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expires = rememberMe
            ? DateTime.UtcNow.AddDays(jwtSettings.GetValue<int?>("RememberMeDurationInDays") ?? 30)
            : DateTime.UtcNow.AddMinutes(jwtSettings.GetValue<double?>("DurationInMinutes") ?? 1440);

        var token = new JwtSecurityToken(
            issuer: jwtSettings.GetValue<string>("Issuer"),
            audience: jwtSettings.GetValue<string>("Audience"),
            claims: claims,
            expires: expires,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return "";
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("90") && digits.Length > 10) digits = digits[2..];
        if (digits.StartsWith("0") && digits.Length == 11) digits = digits[1..];
        return digits;
    }

    private async Task<(string? Email, string? Name, string? Subject)> VerifyGoogleTokenAsync(string idToken, string clientId)
    {
        var client = _httpClientFactory.CreateClient();
        var res = await client.GetAsync($"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(idToken)}");
        if (!res.IsSuccessStatusCode) throw new InvalidOperationException("Google token geçersiz.");

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        var aud = root.GetProperty("aud").GetString();
        if (!string.Equals(aud, clientId, StringComparison.Ordinal))
            throw new InvalidOperationException("Google audience uyuşmuyor.");

        return (
            root.TryGetProperty("email", out var e) ? e.GetString() : null,
            root.TryGetProperty("name", out var n) ? n.GetString() : null,
            root.TryGetProperty("sub", out var s) ? s.GetString() : null
        );
    }

    private async Task<(string? Email, string? Name, string? Subject)> VerifyFacebookTokenAsync(
        string accessToken, string appId, string appSecret)
    {
        var client = _httpClientFactory.CreateClient();
        var appToken = $"{appId}|{appSecret}";
        var debugRes = await client.GetAsync(
            $"https://graph.facebook.com/debug_token?input_token={Uri.EscapeDataString(accessToken)}&access_token={Uri.EscapeDataString(appToken)}");
        if (!debugRes.IsSuccessStatusCode) throw new InvalidOperationException("Facebook token geçersiz.");

        var meRes = await client.GetAsync(
            $"https://graph.facebook.com/me?fields=id,name,email&access_token={Uri.EscapeDataString(accessToken)}");
        if (!meRes.IsSuccessStatusCode) throw new InvalidOperationException("Facebook profil alınamadı.");

        using var doc = JsonDocument.Parse(await meRes.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        return (
            root.TryGetProperty("email", out var e) ? e.GetString() : null,
            root.TryGetProperty("name", out var n) ? n.GetString() : null,
            root.TryGetProperty("id", out var s) ? s.GetString() : null
        );
    }

    /// <summary>Kayitsiz ziyaretci icin JWT; Identity tablosuna yazilmaz.</summary>
    private string GenerateGuestJwtToken(string guestId)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings.GetValue<string>("Secret")
            ?? throw new InvalidOperationException("JwtSettings:Secret eksik.");

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, guestId),
            new(JwtRegisteredClaimNames.GivenName, "Misafir"),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.Role, IdentityRoles.Guest)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var days = jwtSettings.GetValue<int?>("GuestDurationInDays") ?? 30;

        var token = new JwtSecurityToken(
            issuer: jwtSettings.GetValue<string>("Issuer"),
            audience: jwtSettings.GetValue<string>("Audience"),
            claims: claims,
            expires: DateTime.UtcNow.AddDays(days),
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
