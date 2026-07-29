using Microsoft.EntityFrameworkCore;
using Shipping.API.Entities;

namespace Shipping.API.Data;

public class ShippingDbContext : DbContext
{
    public ShippingDbContext(DbContextOptions<ShippingDbContext> options) : base(options)
    {
    }

    public DbSet<Carrier> Carriers { get; set; }
    public DbSet<ShippingRate> ShippingRates { get; set; }
    public DbSet<ShippingSettings> Settings { get; set; }
    public DbSet<Shipment> Shipments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Carrier>(entity =>
        {
            entity.Property(c => c.Name).HasMaxLength(100).IsRequired();
            entity.Property(c => c.Code).HasMaxLength(30).IsRequired();
            entity.HasIndex(c => c.Code).IsUnique();
            entity.Property(c => c.TrackingUrlTemplate).HasMaxLength(300);

            entity.HasMany(c => c.Rates)
                  .WithOne(r => r.Carrier)
                  .HasForeignKey(r => r.CarrierId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ShippingRate>(entity =>
        {
            entity.Property(r => r.MinDesi).HasColumnType("numeric(10,2)");
            entity.Property(r => r.MaxDesi).HasColumnType("numeric(10,2)");
            entity.Property(r => r.MinBasketAmount).HasColumnType("numeric(18,2)");
            entity.Property(r => r.MaxBasketAmount).HasColumnType("numeric(18,2)");
            entity.Property(r => r.Price).HasColumnType("numeric(18,2)");
        });

        modelBuilder.Entity<ShippingSettings>(entity =>
        {
            entity.Property(s => s.FreeShippingThreshold).HasColumnType("numeric(18,2)");
            entity.Property(s => s.DefaultPrice).HasColumnType("numeric(18,2)");
            entity.Property(s => s.DefaultDesiPerItem).HasColumnType("numeric(10,2)");
        });

        modelBuilder.Entity<Shipment>(entity =>
        {
            entity.Property(s => s.OrderId).HasMaxLength(100).IsRequired();
            entity.HasIndex(s => s.OrderId);
            entity.Property(s => s.TrackingNumber).HasMaxLength(60);
            entity.Property(s => s.UserName).HasMaxLength(200);
            entity.Property(s => s.RecipientName).HasMaxLength(150);
            entity.Property(s => s.AddressLine).HasMaxLength(400);
            entity.Property(s => s.City).HasMaxLength(100);
            entity.Property(s => s.ShippingCost).HasColumnType("numeric(18,2)");
        });
    }
}
