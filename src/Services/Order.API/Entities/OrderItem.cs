namespace Order.API.Entities;

public class OrderItem : BaseEntity
{
    // Ürün Bilgisi (Referans)
    public int ProductId { get; private set; }
    public string ProductName { get; private set; } = default!;
    public string PictureUrl { get; private set; } = default!;

    // Satış Bilgisi
    public decimal UnitPrice { get; private set; }
    public int Units { get; private set; }

    // Müşterinin seçtiği varyant özellikleri
    // Örn: "Renk: Kırmızı, Beden: L" veya JSON formatında
    public string SelectedAttributes { get; private set; } = default!;

    // Hangi siparişe ait? (Foreign Key)
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = default!;

    public OrderItem() { }

    public OrderItem(int productId, string productName, string pictureUrl,
        decimal unitPrice, int units, string selectedAttributes)
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
