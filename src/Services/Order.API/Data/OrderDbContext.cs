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
    public DbSet<ReturnRequest> ReturnRequests { get; set; }
    public DbSet<ReturnRequestItem> ReturnRequestItems { get; set; }
    public DbSet<OrderStatusHistory> OrderStatusHistories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<OrderEntity>(builder =>
        {
            // Mevcut tablo semasi korunuyor: yeni isimlendirme eski kolonlara eslenir
            builder.Property(o => o.BuyerId).HasColumnName("UserName");
            builder.Property(o => o.OrderDate).HasColumnName("CreatedDate");

            builder.Property(o => o.OrderNumber).HasMaxLength(40);
            builder.HasIndex(o => o.OrderNumber).IsUnique();

            builder.Property(o => o.TrackingNumber).HasMaxLength(100);
            builder.Property(o => o.InvoiceType).HasMaxLength(40);
            builder.Property(o => o.TaxId).HasMaxLength(40);
            builder.Property(o => o.TaxOffice).HasMaxLength(120);
            builder.Property(o => o.CompanyName).HasMaxLength(200);
            builder.Property(o => o.PaymentMethod).HasMaxLength(40);
            builder.Property(o => o.BillingAddressLine).HasMaxLength(500);
            builder.Property(o => o.BillingCity).HasMaxLength(120);
            builder.Property(o => o.BillingState).HasMaxLength(120);
            builder.Property(o => o.BillingCountry).HasMaxLength(120);
            builder.Property(o => o.BillingZipCode).HasMaxLength(40);

            builder.Property(o => o.GiftMessage).HasMaxLength(500);
            builder.Property(o => o.AdminNote).HasMaxLength(2000);

            // BaseEntity alanlari bu tabloda tutulmuyor
            builder.Ignore(o => o.CreatedAt);
            builder.Ignore(o => o.UpdatedAt);

            builder.OwnsOne(o => o.Address, a =>
            {
                a.Property(p => p.Street).HasColumnName("AddressLine");
                a.Property(p => p.City).HasColumnName("City");
                a.Property(p => p.State).HasColumnName("State");
                a.Property(p => p.Country).HasColumnName("Country");
                a.Property(p => p.ZipCode).HasColumnName("ZipCode");
            });

            // OrderItems navigasyonu _orderItems alani uzerinden okunur/yazilir
            var itemsNav = builder.Metadata.FindNavigation(nameof(OrderEntity.OrderItems));
            itemsNav?.SetPropertyAccessMode(PropertyAccessMode.Field);

            var historyNav = builder.Metadata.FindNavigation(nameof(OrderEntity.StatusHistory));
            historyNav?.SetPropertyAccessMode(PropertyAccessMode.Field);
        });

        modelBuilder.Entity<OrderItem>(builder =>
        {
            builder.Property(i => i.UnitPrice).HasColumnName("Price");
            builder.Property(i => i.Units).HasColumnName("Quantity");

            builder.Ignore(i => i.CreatedAt);
            builder.Ignore(i => i.UpdatedAt);

            builder.HasOne(i => i.Order)
                .WithMany(nameof(OrderEntity.OrderItems))
                .HasForeignKey(i => i.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderStatusHistory>(builder =>
        {
            builder.ToTable("OrderStatusHistories");
            builder.Property(h => h.Status).IsRequired().HasMaxLength(40);
            builder.Property(h => h.Note).HasMaxLength(1000);
            builder.HasIndex(h => h.OrderId);

            builder.HasOne<OrderEntity>()
                .WithMany(nameof(OrderEntity.StatusHistory))
                .HasForeignKey(h => h.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReturnRequest>(builder =>
        {
            builder.Property(r => r.RequestNumber).IsRequired().HasMaxLength(40);
            builder.Property(r => r.BuyerId).IsRequired().HasMaxLength(200);
            builder.Property(r => r.ReasonDetail).HasMaxLength(1000);
            builder.Property(r => r.AdminNote).HasMaxLength(1000);
            builder.Property(r => r.RefundAmount).HasPrecision(18, 2);
            builder.Property(r => r.RequestType).HasConversion<int>();

            builder.HasIndex(r => r.RequestNumber).IsUnique();
            builder.HasIndex(r => r.OrderId);

            builder.HasMany(r => r.Items)
                .WithOne(i => i.ReturnRequest)
                .HasForeignKey(i => i.ReturnRequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReturnRequestItem>(builder =>
        {
            builder.Property(i => i.ProductName).IsRequired().HasMaxLength(300);
            builder.Property(i => i.UnitPrice).HasPrecision(18, 2);
            builder.Property(i => i.ExchangeProductName).HasMaxLength(300);
            builder.Property(i => i.ExchangeSelectedAttributes).HasMaxLength(500);
        });
    }
}
