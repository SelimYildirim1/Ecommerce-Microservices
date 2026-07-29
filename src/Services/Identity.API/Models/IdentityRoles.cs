namespace Identity.API.Models;

/// <summary>Sistemdeki sabit rol isimleri.</summary>
public static class IdentityRoles
{
    public const string Admin = "Admin";
    public const string Customer = "Customer";

    public static readonly string[] All = { Admin, Customer };
}
