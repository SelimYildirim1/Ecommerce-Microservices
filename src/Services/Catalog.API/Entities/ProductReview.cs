namespace Catalog.API.Entities;

/// <summary>Urun yorumu ve puani. Yayina alinmasi icin admin onayi gerekir.</summary>
public class ProductReview : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = default!;

    public string UserId { get; set; } = default!;
    public string UserName { get; set; } = default!;

    /// <summary>1-5 arasi puan.</summary>
    public int Rating { get; set; }

    public string? Title { get; set; }
    public string? Comment { get; set; }

    /// <summary>Onaylanmayan yorumlar vitrine cikmaz.</summary>
    public bool IsApproved { get; set; }

    public string? ModeratorNote { get; set; }

    /// <summary>Kullanıcı bu ürünü gerçekten satın almış mı.</summary>
    public bool IsVerifiedPurchase { get; set; }

    public int HelpfulCount { get; set; }
    public int NotHelpfulCount { get; set; }

    /// <summary>Yorum fotoğrafları (JSON dizi: string[]).</summary>
    public string? ImageUrls { get; set; }

    public ICollection<ReviewVote> Votes { get; set; } = new List<ReviewVote>();
}

/// <summary>Kullanicinin favori urun listesi.</summary>
public class Favorite : BaseEntity
{
    public string UserId { get; set; } = default!;

    public Guid ProductId { get; set; }
    public Product Product { get; set; } = default!;
}
