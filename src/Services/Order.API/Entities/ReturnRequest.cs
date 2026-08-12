namespace Order.API.Entities;

/// <summary>Iade talebinin yasam dongusu.</summary>
public enum ReturnStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Refunded = 3,
    Cancelled = 4
}

/// <summary>Musterinin secebilecegi iade nedenleri.</summary>
public enum ReturnReason
{
    Other = 0,
    Defective = 1,
    WrongItem = 2,
    NotAsDescribed = 3,
    SizeIssue = 4,
    ChangedMind = 5,
    LateDelivery = 6,
    Damaged = 7
}

/// <summary>Iade mi degisim mi.</summary>
public enum ReturnRequestType
{
    Refund = 0,
    Exchange = 1
}

public class ReturnRequest : BaseEntity
{
    public Guid OrderId { get; set; }
    public string BuyerId { get; set; } = default!;

    /// <summary>Musteriye gosterilen kisa talep numarasi (orn. IAD-20260728-4F2A).</summary>
    public string RequestNumber { get; set; } = default!;

    public ReturnRequestType RequestType { get; set; } = ReturnRequestType.Refund;

    public ReturnReason Reason { get; set; }
    public string? ReasonDetail { get; set; }

    public ReturnStatus Status { get; set; } = ReturnStatus.Pending;

    /// <summary>Onaylanan iade tutari. Talep asamasinda beklenen tutar yazilir.</summary>
    public decimal RefundAmount { get; set; }

    public string? AdminNote { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public DateTime? RefundedAt { get; set; }

    public List<ReturnRequestItem> Items { get; set; } = new();
}

public class ReturnRequestItem : BaseEntity
{
    public Guid ReturnRequestId { get; set; }
    public ReturnRequest ReturnRequest { get; set; } = default!;

    public Guid OrderItemId { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public decimal UnitPrice { get; set; }
    public int Units { get; set; }

    /// <summary>Degisim talebinde istenen urun.</summary>
    public Guid? ExchangeProductId { get; set; }
    public string? ExchangeProductName { get; set; }
    public string? ExchangeSelectedAttributes { get; set; }
}
