namespace Basket.API.Entities;

public class ShoppingCartItem
{
    public int Quantity { get; set; }
    public string Color { get; set; } = default!;
    public decimal Price { get; set; }
    public string ProductId { get; set; } = default!;
    public string ProductName { get; set; } = default!;

    /// <summary>Eski sepet kayitlarinda bulunmayabilir; bos ise vitrin katalogdan gorsel cozer.</summary>
    public string? PictureUrl { get; set; }
}