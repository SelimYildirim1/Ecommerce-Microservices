namespace Catalog.API.Entities;

/// <summary>Müşteri segmenti (Identity kullanıcı kimliği ile ilişkilendirilir).</summary>
public class CustomerSegment : BaseEntity
{
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public string? Color { get; set; }

    public ICollection<CustomerSegmentMember> Members { get; set; } = new List<CustomerSegmentMember>();
}

public class CustomerSegmentMember
{
    public Guid SegmentId { get; set; }
    public CustomerSegment Segment { get; set; } = default!;

    public string UserId { get; set; } = default!;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Admin notu — müşteri detayında gösterilir.</summary>
public class CustomerNote : BaseEntity
{
    public string UserId { get; set; } = default!;
    public string Note { get; set; } = default!;
    public string? CreatedByUserId { get; set; }
    public string? CreatedByName { get; set; }
}
