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
    public DbSet<ProductReview> ProductReviews { get; set; }
    public DbSet<Favorite> Favorites { get; set; }
    public DbSet<StockMovement> StockMovements { get; set; }
    public DbSet<SiteSetting> SiteSettings { get; set; }
    public DbSet<Banner> Banners { get; set; }
    public DbSet<StaticPage> StaticPages { get; set; }

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

            entity.Property(p => p.Slug).HasMaxLength(200);
            entity.Property(p => p.MetaTitle).HasMaxLength(200);
            entity.Property(p => p.MetaDescription).HasMaxLength(500);

            entity.HasIndex(p => p.CategoryId);
            entity.HasIndex(p => p.BrandId);
            entity.HasIndex(p => p.Name);
            entity.HasIndex(p => p.Slug);
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

        // ---- ProductReview ----
        modelBuilder.Entity<ProductReview>(entity =>
        {
            entity.HasOne(r => r.Product)
                  .WithMany(p => p.Reviews)
                  .HasForeignKey(r => r.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(r => r.UserId).IsRequired().HasMaxLength(200);
            entity.Property(r => r.UserName).IsRequired().HasMaxLength(200);
            entity.Property(r => r.Title).HasMaxLength(200);
            entity.Property(r => r.Comment).HasMaxLength(2000);
            entity.Property(r => r.ModeratorNote).HasMaxLength(500);

            entity.HasIndex(r => r.ProductId);
            entity.HasIndex(r => new { r.ProductId, r.UserId });
        });

        // ---- Favorite ----
        modelBuilder.Entity<Favorite>(entity =>
        {
            entity.HasOne(f => f.Product)
                  .WithMany()
                  .HasForeignKey(f => f.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(f => f.UserId).IsRequired().HasMaxLength(200);

            // Ayni urun bir kullanicida bir kez bulunur
            entity.HasIndex(f => new { f.UserId, f.ProductId }).IsUnique();
        });

        // ---- StockMovement ----
        modelBuilder.Entity<StockMovement>(entity =>
        {
            entity.HasOne(m => m.ProductVariant)
                  .WithMany()
                  .HasForeignKey(m => m.ProductVariantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(m => m.Reference).HasMaxLength(200);
            entity.Property(m => m.Note).HasMaxLength(500);
            entity.Property(m => m.CreatedBy).IsRequired().HasMaxLength(200);

            entity.HasIndex(m => m.ProductVariantId);
            entity.HasIndex(m => m.ProductId);
            entity.HasIndex(m => m.CreatedAt);
        });

        // ---- SiteSetting ----
        modelBuilder.Entity<SiteSetting>(entity =>
        {
            entity.Property(s => s.Key).IsRequired().HasMaxLength(100);
            entity.Property(s => s.Group).IsRequired().HasMaxLength(50);
            entity.Property(s => s.Value).HasMaxLength(2000);
            entity.Property(s => s.Description).HasMaxLength(300);

            entity.HasIndex(s => s.Key).IsUnique();
        });

        // ---- Banner ----
        modelBuilder.Entity<Banner>(entity =>
        {
            entity.Property(b => b.Title).IsRequired().HasMaxLength(200);
            entity.Property(b => b.Subtitle).HasMaxLength(300);
            entity.Property(b => b.ImageUrl).IsRequired().HasMaxLength(500);
            entity.Property(b => b.LinkUrl).HasMaxLength(500);
            entity.Property(b => b.Placement).IsRequired().HasMaxLength(50);

            entity.HasIndex(b => new { b.Placement, b.SortOrder });
        });

        // ---- StaticPage ----
        modelBuilder.Entity<StaticPage>(entity =>
        {
            entity.Property(p => p.Slug).IsRequired().HasMaxLength(150);
            entity.Property(p => p.Title).IsRequired().HasMaxLength(200);
            entity.Property(p => p.MetaTitle).HasMaxLength(200);
            entity.Property(p => p.MetaDescription).HasMaxLength(500);

            entity.HasIndex(p => p.Slug).IsUnique();
        });
    }
}
