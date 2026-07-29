namespace Order.API.Entities;

public class OrderItem : BaseEntity
{
    // Ürün Bilgisi (Referans) — Catalog'daki ürün Id'si
    public Guid ProductId { get; private set; }
    public string ProductName { get; private set; } = default!;
    public string? PictureUrl { get; private set; }

    /// <summary>Birim fiyat. Veritabaninda "Price" kolonunda tutulur.</summary>
    public decimal UnitPrice { get; private set; }

    /// <summary>Adet. Veritabaninda "Quantity" kolonunda tutulur.</summary>
    public int Units { get; private set; }

    // Müşterinin seçtiği varyant özellikleri
    // Örn: "Renk: Kırmızı, Beden: L" veya JSON formatında
    public string? SelectedAttributes { get; private set; }

    // Hangi siparişe ait? (Foreign Key)
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = default!;

    public OrderItem() { }

    public OrderItem(Guid productId, string productName, string? pictureUrl,
        decimal unitPrice, int units, string? selectedAttributes)
    {
        ProductId = productId;
        ProductName = productName;
        PictureUrl = pictureUrl;
        UnitPrice = unitPrice;
        Units = units;
        SelectedAttributes = selectedAttributes;
    }

    public void AddUnits(int units)
    {
        Units += units;
    }
}
