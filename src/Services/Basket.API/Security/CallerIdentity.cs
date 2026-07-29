using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Basket.API.Security;

public static class CallerIdentity
{
    public static string? GetUserId(ClaimsPrincipal user) =>
        user.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? user.FindFirstValue("sub");

    public static bool IsAdmin(ClaimsPrincipal user) => user.IsInRole("Admin");

    public static bool CanAccessBasket(ClaimsPrincipal user, string userName) =>
        IsAdmin(user)
        || string.Equals(GetUserId(user), userName, StringComparison.Ordinal);
}
