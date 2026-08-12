namespace Identity.API.Models;

// Kayıt olurken istenecek bilgiler
public class RegisterRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
    public string UserName { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
}

// Giriş yaparken istenecek bilgiler
public class LoginRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
    public bool RememberMe { get; set; }
}

public class ExternalLoginRequest
{
    public string Provider { get; set; } = default!; // google | facebook
    public string IdToken { get; set; } = default!;
}

public class OtpRequest
{
    public string PhoneNumber { get; set; } = default!;
}

public class OtpVerifyRequest
{
    public string PhoneNumber { get; set; } = default!;
    public string Code { get; set; } = default!;
}

// Başarılı olursa döneceğimiz cevap (Token burada olacak)
public class AuthResponse
{
    public string Email { get; set; }
    public string UserName { get; set; }
    public string Token { get; set; }
    public List<string> Roles { get; set; } = new();
}

/// <summary>Misafir oturumu — Identity kaydi yok.</summary>
public class GuestAuthResponse
{
    public string GuestId { get; set; } = default!;
    public string Token { get; set; } = default!;
    public int ExpiresInDays { get; set; }
}

// Kullanıcıya rol atarken kullanılır
public class AssignRoleRequest
{
    public string Role { get; set; } = default!;
}

// Admin dashboard için kullanıcı listesi DTO'su
// Not: mevcut alanlar korunur, yeni alanlar eklenir (geriye donuk uyumluluk)
public class UserListDto
{
    public string Id { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public string Email { get; set; } = default!;

    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>Hesap engelli mi? Identity'nin LockoutEnd alanindan turetilir.</summary>
    public bool IsBlocked { get; set; }

    public List<string> Roles { get; set; } = new();
    public int AddressCount { get; set; }
}

public class UserDetailDto : UserListDto
{
    public bool EmailConfirmed { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public List<UserAddressDto> Addresses { get; set; } = new();
}

public class BlockUserRequest
{
    /// <summary>true ise hesap engellenir, false ise engel kaldirilir.</summary>
    public bool Blocked { get; set; }
}

// --- Adres defteri ---

public class UserAddressDto
{
    public int Id { get; set; }
    public string AddressTitle { get; set; } = default!;
    public string RecipientName { get; set; } = default!;
    public string Street { get; set; } = default!;
    public string City { get; set; } = default!;
    public string District { get; set; } = default!;
    public string ZipCode { get; set; } = default!;
    public string Country { get; set; } = default!;
    public string PhoneNumber { get; set; } = default!;
    public bool IsDefault { get; set; }
}

// --- Profil ---

public class ProfileDto
{
    public string Id { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class UpdateProfileRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = default!;
    public string NewPassword { get; set; } = default!;
}

public class ForgotPasswordRequest
{
    public string Email { get; set; } = default!;
}

public class ResetPasswordRequest
{
    public string Email { get; set; } = default!;
    public string Token { get; set; } = default!;
    public string NewPassword { get; set; } = default!;
}

public class ConfirmEmailRequest
{
    public string UserId { get; set; } = default!;
    public string Token { get; set; } = default!;
}

public class ResendConfirmationRequest
{
    public string Email { get; set; } = default!;
}

public class SaveUserAddressRequest
{
    public string AddressTitle { get; set; } = default!;
    public string RecipientName { get; set; } = default!;
    public string Street { get; set; } = default!;
    public string City { get; set; } = default!;
    public string District { get; set; } = default!;
    public string? ZipCode { get; set; }
    public string? Country { get; set; }
    public string PhoneNumber { get; set; } = default!;
    public bool IsDefault { get; set; }
}

public class NotificationPreferenceDto
{
    public bool OrderUpdates { get; set; } = true;
    public bool Campaigns { get; set; } = true;
    public bool Newsletter { get; set; } = true;
    public bool Sms { get; set; }
    public bool StockAlerts { get; set; } = true;
    public bool PriceDrops { get; set; } = true;
}

public class ExportDataDto
{
    public ProfileDto Profile { get; set; } = default!;
    public List<UserAddressDto> Addresses { get; set; } = new();
    public NotificationPreferenceDto Preferences { get; set; } = new();
}
