using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Catalog.API.Security;

/// <summary>JWT claim'lerinden cagiran kullanici kimligini okur.</summary>
public static class CallerIdentity
{
    public static string? GetUserId(ClaimsPrincipal user) =>
        user.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? user.FindFirstValue("sub");

    public static bool IsAdmin(ClaimsPrincipal user) => user.IsInRole("Admin");

    /// <summary>
    /// Kaynak sahibi veya Admin degilse erisim yok. Admin her kaynaga erisebilir.
    /// </summary>
    public static bool CanAccessUser(ClaimsPrincipal user, string userId) =>
        IsAdmin(user)
        || string.Equals(GetUserId(user), userId, StringComparison.Ordinal);
}
