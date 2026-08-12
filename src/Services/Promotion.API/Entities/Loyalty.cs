namespace Promotion.API.Entities;

public class LoyaltyAccount : BaseEntity
{
    public string UserId { get; set; } = default!;
    public int Points { get; set; }
    public DateTime? LastEarnedAt { get; set; }

    public ICollection<LoyaltyTransaction> Transactions { get; set; } = new List<LoyaltyTransaction>();
}

public enum LoyaltyTransactionType
{
    Earn = 0,
    Redeem = 1
}

public class LoyaltyTransaction : BaseEntity
{
    public Guid LoyaltyAccountId { get; set; }
    public LoyaltyAccount Account { get; set; } = default!;

    public LoyaltyTransactionType Type { get; set; }
    public int Points { get; set; }
    public string? Description { get; set; }
    public Guid? OrderId { get; set; }
}
