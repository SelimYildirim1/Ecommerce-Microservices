using Microsoft.AspNetCore.Identity;

namespace Identity.API.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;

    /// <summary>Kayit tarihi. Eski kayitlarda varsayilan deger atanir.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    // Kullanıcının kayıtlı adresleri
    public ICollection<UserAddress> Addresses { get; set; } = new List<UserAddress>();
}
