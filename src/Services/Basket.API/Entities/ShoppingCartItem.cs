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

    /// <summary>Secilen varyant; eski kayitlarda yoksa null (geriye uyumlu).</summary>
    public string? VariantId { get; set; }
}

public class MergeBasketRequest
{
    public string FromUserName { get; set; } = default!;
    public string ToUserName { get; set; } = default!;
}