namespace Basket.API.Models;

public class CatalogProductDto
{
    public string Id { get; set; } = default!;
    public string Name { get; set; } = default!;
    public decimal Price { get; set; }
    // Bize şimdilik sadece fiyat ve isim lazım, diğer detaylara gerek yok.
}