namespace Catalog.API.Entities;

public class Product
{
    public Guid Id { get; set; } // Benzersiz Kimlik (Primary Key)
    public string Name { get; set; } = default!; // Ürün Adı
    public string Description { get; set; } = default!; // Açıklama
    public decimal Price { get; set; } // Fiyat
    public string PictureUrl { get; set; } = default!; // Resim Yolu
    public int StockQuantity { get; set; } // Stok Adedi
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // Oluşturulma Tarihi
}