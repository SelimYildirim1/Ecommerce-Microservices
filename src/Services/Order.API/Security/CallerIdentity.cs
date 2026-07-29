using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Order.API.Security;

/// <summary>JWT claim'lerinden cagiran kullanici kimligini okur.</summary>
public static class CallerIdentity
{
    public static string? GetUserId(ClaimsPrincipal user)
    {
        return user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub");
    }

    public static bool IsAdmin(ClaimsPrincipal user) =>
        user.IsInRole("Admin");

    /// <summary>
    /// Kaynak sahibi veya Admin degilse Forbid. Admin her kaynaga erisebilir.
    /// </summary>
    public static bool CanAccessBuyer(ClaimsPrincipal user, string buyerId)
    {
        if (IsAdmin(user)) return true;
        var callerId = GetUserId(user);
        return !string.IsNullOrEmpty(callerId)
            && string.Equals(callerId, buyerId, StringComparison.Ordinal);
    }
}
