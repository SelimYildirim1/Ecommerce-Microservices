namespace Catalog.API.Entities;

/// <summary>Ürün soru-cevap. Vitrine çıkması için onay gerekir.</summary>
public class ProductQuestion : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = default!;

    public string? UserId { get; set; }
    public string UserName { get; set; } = default!;
    public string? Email { get; set; }

    public string Question { get; set; } = default!;
    public string? Answer { get; set; }
    public string? AnsweredBy { get; set; }
    public DateTime? AnsweredAt { get; set; }

    public bool IsApproved { get; set; }
}

/// <summary>Yorum faydalı / faydasız oyu. Kullanıcı başına bir oy.</summary>
public class ReviewVote : BaseEntity
{
    public Guid ReviewId { get; set; }
    public ProductReview Review { get; set; } = default!;

    public string UserId { get; set; } = default!;
    public bool IsHelpful { get; set; }
}
