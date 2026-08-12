namespace Identity.API.Models;

/// <summary>Sistemdeki sabit rol isimleri.</summary>
public static class IdentityRoles
{
    public const string Admin = "Admin";
    public const string Editor = "Editor";
    public const string Support = "Support";
    public const string Warehouse = "Warehouse";
    public const string Customer = "Customer";

    /// <summary>Kayitsiz ziyaretci; Identity tablosunda satiri yoktur, yalnizca JWT claim'idir.</summary>
    public const string Guest = "Guest";

    /// <summary>Veritabanina seed edilecek rolller (Guest haric).</summary>
    public static readonly string[] All =
    {
        Admin, Editor, Support, Warehouse, Customer
    };

    /// <summary>Yonetim paneline erisebilen roller.</summary>
    public static readonly string[] Staff =
    {
        Admin, Editor, Support, Warehouse
    };
}
