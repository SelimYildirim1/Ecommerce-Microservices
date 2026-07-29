namespace Identity.API.Models;

/// <summary>
/// Kullanıcının kayıtlı adres defteri.
/// Sipariş verirken "Ev Adresimi Seç" gibi kullanılır.
/// </summary>
public class UserAddress
{
    public int Id { get; set; }

    // Hangi kullanıcıya ait?
    public string UserId { get; set; } = default!;
    public ApplicationUser User { get; set; } = default!;

    public string AddressTitle { get; set; } = default!; // "Evim", "Ofis"

    // Adres Detayları
    public string RecipientName { get; set; } = default!; // Alıcı adı (başkasına da gönderilebilir)
    public string Street { get; set; } = default!;
    public string City { get; set; } = default!;
    public string District { get; set; } = default!; // İlçe
    public string ZipCode { get; set; } = default!;
    public string Country { get; set; } = default!;
    public string PhoneNumber { get; set; } = default!; // Kargo için şart

    /// <summary>Checkout'ta on secili gelen adres.</summary>
    public bool IsDefault { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
