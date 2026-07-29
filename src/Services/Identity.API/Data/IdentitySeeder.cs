using Identity.API.Models;
using Microsoft.AspNetCore.Identity;

namespace Identity.API.Data;

/// <summary>
/// Rolleri ve varsayilan admin kullanicisini olusturur.
/// Uygulama her acilista calisir, mevcut kayitlara dokunmaz (idempotent).
/// </summary>
public static class IdentitySeeder
{
    public static async Task SeedAsync(
        RoleManager<IdentityRole> roleManager,
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken ct = default)
    {
        foreach (var roleName in IdentityRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
                logger.LogInformation("Rol olusturuldu: {Role}", roleName);
            }
        }

        var adminEmail = configuration["DefaultAdmin:Email"] ?? "admin@ecommerce.local";
        var adminUserName = configuration["DefaultAdmin:UserName"] ?? "admin";
        var adminPassword = configuration["DefaultAdmin:Password"];

        // Production'da varsayılan zayıf şifre kullanılmaz
        if (string.IsNullOrWhiteSpace(adminPassword))
        {
            if (string.Equals(
                    Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
                    "Production",
                    StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning(
                    "DefaultAdmin:Password tanımlı değil; Production'da admin seed atlandı.");
                await BackfillExistingUsersAsync(userManager, logger);
                return;
            }

            adminPassword = "Admin123!";
        }

        var admin = await userManager.FindByEmailAsync(adminEmail);

        if (admin is null)
        {
            admin = new ApplicationUser
            {
                Email = adminEmail,
                UserName = adminUserName,
                FirstName = "Admin",
                LastName = "User",
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(admin, adminPassword);

            if (!result.Succeeded)
            {
                logger.LogError("Varsayilan admin olusturulamadi: {Errors}",
                    string.Join(", ", result.Errors.Select(e => e.Description)));
                return;
            }

            logger.LogInformation("Varsayilan admin olusturuldu: {Email}", adminEmail);
        }

        if (!await userManager.IsInRoleAsync(admin, IdentityRoles.Admin))
        {
            await userManager.AddToRoleAsync(admin, IdentityRoles.Admin);
            logger.LogInformation("{Email} kullanicisina Admin rolu atandi.", adminEmail);
        }

        await BackfillExistingUsersAsync(userManager, logger);
    }

    /// <summary>
    /// Rol atamasi ve kayit tarihi olmayan eski kullanicilari tamamlar.
    /// Rol sistemi sonradan eklendigi icin gerekli; bir kez calisip idempotent kalir.
    /// </summary>
    private static async Task BackfillExistingUsersAsync(
        UserManager<ApplicationUser> userManager, ILogger logger)
    {
        var users = userManager.Users.ToList();
        var patched = 0;

        foreach (var user in users)
        {
            var changed = false;

            if ((await userManager.GetRolesAsync(user)).Count == 0)
            {
                await userManager.AddToRoleAsync(user, IdentityRoles.Customer);
                changed = true;
            }

            if (user.CreatedAt == default)
            {
                user.CreatedAt = DateTime.UtcNow;
                await userManager.UpdateAsync(user);
                changed = true;
            }

            if (changed) patched++;
        }

        if (patched > 0)
            logger.LogInformation("{Count} mevcut kullanici icin rol/kayit tarihi tamamlandi.", patched);
    }
}
