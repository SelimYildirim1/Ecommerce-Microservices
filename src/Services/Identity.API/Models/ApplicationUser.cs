using Microsoft.AspNetCore.Identity;

namespace Identity.API.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;

    // Kullanıcının kayıtlı adresleri
    public ICollection<UserAddress> Addresses { get; set; } = new List<UserAddress>();
}