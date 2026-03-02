using Identity.API.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Identity.API.Data;

// IdentityDbContext'ten miras alıyoruz, böylece "Users", "Roles" tabloları hazır geliyor.
public class AppIdentityDbContext : IdentityDbContext<ApplicationUser>
{
    public AppIdentityDbContext(DbContextOptions<AppIdentityDbContext> options) : base(options)
    {
    }

    public DbSet<UserAddress> UserAddresses { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<UserAddress>(entity =>
        {
            entity.HasKey(a => a.Id);

            entity.HasOne(a => a.User)
                .WithMany(u => u.Addresses)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(a => a.AddressTitle).HasMaxLength(50);
            entity.Property(a => a.RecipientName).HasMaxLength(100);
            entity.Property(a => a.Street).HasMaxLength(250);
            entity.Property(a => a.City).HasMaxLength(100);
            entity.Property(a => a.District).HasMaxLength(100);
            entity.Property(a => a.ZipCode).HasMaxLength(20);
            entity.Property(a => a.Country).HasMaxLength(100);
            entity.Property(a => a.PhoneNumber).HasMaxLength(20);
        });
    }
}