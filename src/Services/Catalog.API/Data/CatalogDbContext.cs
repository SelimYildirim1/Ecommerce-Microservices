using Catalog.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Data;

public class CatalogDbContext : DbContext
{
    public CatalogDbContext(DbContextOptions<CatalogDbContext> options) : base(options)
    {
    }

    public DbSet<Product> Products { get; set; }
    public DbSet<ProductVariant> ProductVariants { get; set; }
    public DbSet<ProductAttribute> ProductAttributes { get; set; }
    public DbSet<ProductImage> ProductImages { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<CategoryAttribute> CategoryAttributes { get; set; }
    public DbSet<Brand> Brands { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ---- Category (Ağaç yapısı - Self-referencing) ----
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasOne(c => c.Parent)
                  .WithMany(c => c.Children)
                  .HasForeignKey(c => c.ParentId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(c => c.ParentId);
            entity.HasIndex(c => c.Name);
        });

        // ---- ProductAttribute ----
        modelBuilder.Entity<ProductAttribute>(entity =>
        {
            entity.HasIndex(a => a.Code).IsUnique();
        });

        // ---- CategoryAttribute (Many-to-Many: Category <-> ProductAttribute) ----
        modelBuilder.Entity<CategoryAttribute>(entity =>
        {
            entity.HasOne(ca => ca.Category)
                  .WithMany(c => c.CategoryAttributes)
                  .HasForeignKey(ca => ca.CategoryId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ca => ca.ProductAttribute)
                  .WithMany(a => a.CategoryAttributes)
                  .HasForeignKey(ca => ca.ProductAttributeId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Aynı kategori-özellik çifti tekrar edemez
            entity.HasIndex(ca => new { ca.CategoryId, ca.ProductAttributeId }).IsUnique();
        });

        // ---- Brand ----
        modelBuilder.Entity<Brand>(entity =>
        {
            entity.HasIndex(b => b.Name).IsUnique();
        });

        // ---- Product ----
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasOne(p => p.Category)
                  .WithMany(c => c.Products)
                  .HasForeignKey(p => p.CategoryId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.Brand)
                  .WithMany(b => b.Products)
                  .HasForeignKey(p => p.BrandId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(p => p.CategoryId);
            entity.HasIndex(p => p.BrandId);
            entity.HasIndex(p => p.Name);
        });

        // ---- ProductVariant ----
        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.HasOne(v => v.Product)
                  .WithMany(p => p.Variants)
                  .HasForeignKey(v => v.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(v => v.Sku).IsUnique();
            entity.HasIndex(v => v.ProductId);

            // JSONB kolonu - PostgreSQL'e özgü
            entity.Property(v => v.Specifics)
                  .HasColumnType("jsonb");
        });

        // ---- ProductImage ----
        modelBuilder.Entity<ProductImage>(entity =>
        {
            entity.HasOne(i => i.Product)
                  .WithMany(p => p.Images)
                  .HasForeignKey(i => i.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(i => i.ProductId);
        });
    }
}
