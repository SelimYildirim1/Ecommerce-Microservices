using Identity.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Identity.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _configuration;

    public AuthController(UserManager<ApplicationUser> userManager, 
                          SignInManager<ApplicationUser> signInManager, 
                          IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        // 1. Kullanıcıyı bul
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) return Unauthorized("Kullanıcı bulunamadı.");

        // 2. Şifreyi kontrol et
        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        
        if (!result.Succeeded) return Unauthorized("Şifre hatalı.");

        // 3. Token üret ve gönder
        var token = GenerateJwtToken(user);

        return Ok(new AuthResponse 
        { 
            Email = user.Email, 
            UserName = user.UserName, 
            Token = token 
        });
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
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
            LastName = request.LastName
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded) return BadRequest(result.Errors);

        // 3. Başarılıysa direkt token verelim (Kullanıcıyı yormayalım)
        var token = GenerateJwtToken(user);

        return Ok(new AuthResponse
        {
            Email = user.Email,
            UserName = user.UserName,
            Token = token
        });
    }

    // --- JWT TOKEN ÜRETME MOTORU ---
    private string GenerateJwtToken(ApplicationUser user)
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
}