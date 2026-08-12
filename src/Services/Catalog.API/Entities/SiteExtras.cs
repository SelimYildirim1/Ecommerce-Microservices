namespace Catalog.API.Entities;

/// <summary>İletişim formu mesajı.</summary>
public class ContactMessage : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string? Phone { get; set; }
    public string Subject { get; set; } = default!;
    public string Message { get; set; } = default!;
    public bool IsRead { get; set; }
}

/// <summary>Bülten abonesi. MVP: kayıt anında IsConfirmed=true (double-opt-in e-postası yok).</summary>
public class NewsletterSubscriber : BaseEntity
{
    public string Email { get; set; } = default!;
    public bool IsConfirmed { get; set; }
    public string? ConfirmToken { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? UnsubscribedAt { get; set; }
}

/// <summary>Stok gelince haber ver talebi.</summary>
public class StockNotificationRequest : BaseEntity
{
    public Guid ProductId { get; set; }
    public string Email { get; set; } = default!;
    public string? UserId { get; set; }
    public bool IsNotified { get; set; }
    public DateTime? NotifiedAt { get; set; }
}

/// <summary>SSS maddesi.</summary>
public class FaqItem : BaseEntity
{
    public string Category { get; set; } = default!;
    public string Question { get; set; } = default!;
    public string Answer { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; } = true;
}
