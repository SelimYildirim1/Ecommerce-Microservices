using Microsoft.EntityFrameworkCore;
using Order.API.Entities;
using Order.API.Domain.AggregatesModel.OrderAggregate;

// "Order" kelimesi karışmasın diye "OrderEntity" takma adı
using OrderEntity = Order.API.Entities.Order;

namespace Order.API.Data;

public class OrderDbContext : DbContext
{
    public OrderDbContext(DbContextOptions<OrderDbContext> options) : base(options)
    {
    }

    public DbSet<OrderEntity> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<OrderEntity>(builder =>
        {
            // Address value object'i Owned Type olarak yapılandır
            builder.OwnsOne(o => o.Address, a =>
            {
                a.Property(p => p.Street).HasColumnName("Street");
                a.Property(p => p.City).HasColumnName("City");
                a.Property(p => p.State).HasColumnName("State");
                a.Property(p => p.Country).HasColumnName("Country");
                a.Property(p => p.ZipCode).HasColumnName("ZipCode");
            });

            // Private backing field üzerinden OrderItems ilişkisi
            var navigation = builder.Metadata.FindNavigation(nameof(OrderEntity.OrderItems));
            navigation?.SetPropertyAccessMode(PropertyAccessMode.Field);

            builder.HasMany(typeof(OrderItem), "_orderItems")
                .WithOne(nameof(OrderItem.Order))
                .HasForeignKey(nameof(OrderItem.OrderId));
        });
    }
}
