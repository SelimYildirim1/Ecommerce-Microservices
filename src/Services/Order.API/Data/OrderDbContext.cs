using Microsoft.EntityFrameworkCore;
using Order.API.Entities;

// ÇÖZÜM BURADA: "Order" kelimesi karışmasın diye ona "OrderEntity" takma adını veriyoruz.
using OrderEntity = Order.API.Entities.Order; 

namespace Order.API.Data;

public class OrderDbContext : DbContext
{
    public OrderDbContext(DbContextOptions<OrderDbContext> options) : base(options)
    {
    }

    // Burada artık "Order" değil, yukarıda tanımladığımız "OrderEntity"yi kullanıyoruz.
    public DbSet<OrderEntity> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Burada da "OrderEntity" kullanıyoruz
        modelBuilder.Entity<OrderEntity>()
            .HasMany(o => o.OrderItems)
            .WithOne(i => i.Order)
            .HasForeignKey(i => i.OrderId);
    }
}