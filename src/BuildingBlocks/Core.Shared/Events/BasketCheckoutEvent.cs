namespace Core.Shared.Events;

public interface BasketCheckoutEvent
{
    string UserName { get; set; }
    decimal TotalPrice { get; set; }
    
    // Adres Bilgileri
    string FirstName { get; set; }
    string LastName { get; set; }
    string EmailAddress { get; set; }
    string AddressLine { get; set; }
    
    // Basitlik olsun diye şimdilik ürün detaylarını bu evente koymuyoruz.
    // Gerçek hayat senaryosunda Order servisi Redis'e gidip detayları alabilir
    // veya bu event içinde liste olarak taşıyabiliriz.
}