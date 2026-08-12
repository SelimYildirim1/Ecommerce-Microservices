using Microsoft.EntityFrameworkCore;
using Promotion.API.Entities;

namespace Promotion.API.Data;

public class PromotionDbContext : DbContext
{
    public PromotionDbContext(DbContextOptions<PromotionDbContext> options) : base(options)
    {
    }

    public DbSet<Coupon> Coupons { get; set; }
    public DbSet<CouponUsage> CouponUsages { get; set; }
    public DbSet<Campaign> Campaigns { get; set; }
    public DbSet<LoyaltyAccount> LoyaltyAccounts { get; set; }
    public DbSet<LoyaltyTransaction> LoyaltyTransactions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Coupon>(entity =>
        {
            entity.Property(c => c.Code).HasMaxLength(50).IsRequired();
            entity.HasIndex(c => c.Code).IsUnique();
            entity.Property(c => c.Description).HasMaxLength(300);
            entity.Property(c => c.Value).HasColumnType("numeric(18,2)");
            entity.Property(c => c.MinBasketAmount).HasColumnType("numeric(18,2)");
            entity.Property(c => c.MaxDiscountAmount).HasColumnType("numeric(18,2)");

            entity.HasMany(c => c.Usages)
                  .WithOne(u => u.Coupon)
                  .HasForeignKey(u => u.CouponId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CouponUsage>(entity =>
        {
            entity.Property(u => u.UserName).HasMaxLength(200).IsRequired();
            entity.Property(u => u.OrderId).HasMaxLength(100);
            entity.Property(u => u.DiscountAmount).HasColumnType("numeric(18,2)");
            entity.HasIndex(u => new { u.CouponId, u.UserName });
        });

        modelBuilder.Entity<LoyaltyAccount>(entity =>
        {
            entity.Property(a => a.UserId).HasMaxLength(200).IsRequired();
            entity.HasIndex(a => a.UserId).IsUnique();
            entity.HasMany(a => a.Transactions)
                  .WithOne(t => t.Account)
                  .HasForeignKey(t => t.LoyaltyAccountId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LoyaltyTransaction>(entity =>
        {
            entity.Property(t => t.Description).HasMaxLength(500);
            entity.HasIndex(t => t.LoyaltyAccountId);
        });

        modelBuilder.Entity<Campaign>(entity =>
        {
            entity.Property(c => c.Name).HasMaxLength(150).IsRequired();
            entity.Property(c => c.Description).HasMaxLength(300);
            entity.Property(c => c.Value).HasColumnType("numeric(18,2)");
            entity.Property(c => c.MinBasketAmount).HasColumnType("numeric(18,2)");
            entity.Property(c => c.MaxDiscountAmount).HasColumnType("numeric(18,2)");
            entity.HasIndex(c => c.IsActive);
        });
    }
}
