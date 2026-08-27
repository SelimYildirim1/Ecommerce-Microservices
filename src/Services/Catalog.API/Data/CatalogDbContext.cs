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
    public DbSet<ReviewVote> ReviewVotes { get; set; }
    public DbSet<ProductQuestion> ProductQuestions { get; set; }
    public DbSet<Favorite> Favorites { get; set; }
    public DbSet<StockMovement> StockMovements { get; set; }
    public DbSet<SiteSetting> SiteSettings { get; set; }
    public DbSet<Banner> Banners { get; set; }
    public DbSet<StaticPage> StaticPages { get; set; }
    public DbSet<BlogPost> BlogPosts { get; set; }
    public DbSet<BlogCategory> BlogCategories { get; set; }
    public DbSet<BlogTag> BlogTags { get; set; }
    public DbSet<BlogPostTag> BlogPostTags { get; set; }
    public DbSet<BlogComment> BlogComments { get; set; }
    public DbSet<ContactMessage> ContactMessages { get; set; }
    public DbSet<NewsletterSubscriber> NewsletterSubscribers { get; set; }
    public DbSet<StockNotificationRequest> StockNotificationRequests { get; set; }
    public DbSet<FaqItem> FaqItems { get; set; }
    public DbSet<SearchQueryLog> SearchQueryLogs { get; set; }
    public DbSet<Currency> Currencies { get; set; }
    public DbSet<Warehouse> Warehouses { get; set; }
    public DbSet<ProductVariantStock> ProductVariantStocks { get; set; }
    public DbSet<AuditLogEntry> AuditLogEntries { get; set; }
    public DbSet<NavMenu> NavMenus { get; set; }
    public DbSet<NavMenuItem> NavMenuItems { get; set; }
    public DbSet<CustomerSegment> CustomerSegments { get; set; }
    public DbSet<CustomerSegmentMember> CustomerSegmentMembers { get; set; }
    public DbSet<CustomerNote> CustomerNotes { get; set; }

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

            entity.Property(c => c.Slug).HasMaxLength(200);
            entity.Property(c => c.LegacySlug).HasMaxLength(200);
            entity.Property(c => c.ImageUrl).HasMaxLength(500);
            entity.Property(c => c.MetaTitle).HasMaxLength(200);
            entity.Property(c => c.MetaDescription).HasMaxLength(500);

            entity.HasIndex(c => c.ParentId);
            entity.HasIndex(c => c.Name);
            entity.HasIndex(c => c.Slug);
            entity.HasIndex(c => c.LegacySlug);
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
            entity.Property(b => b.Slug).HasMaxLength(200);
            entity.Property(b => b.LegacySlug).HasMaxLength(200);
            entity.Property(b => b.Description).HasMaxLength(2000);
            entity.Property(b => b.MetaTitle).HasMaxLength(200);
            entity.Property(b => b.MetaDescription).HasMaxLength(500);
            entity.HasIndex(b => b.Slug);
            entity.HasIndex(b => b.LegacySlug);
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

            entity.Property(i => i.MediaType).HasMaxLength(20);
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
            entity.Property(r => r.ImageUrls).HasColumnType("jsonb");

            entity.HasIndex(r => r.ProductId);
            entity.HasIndex(r => new { r.ProductId, r.UserId });
        });

        // ---- ReviewVote ----
        modelBuilder.Entity<ReviewVote>(entity =>
        {
            entity.HasOne(v => v.Review)
                  .WithMany(r => r.Votes)
                  .HasForeignKey(v => v.ReviewId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(v => v.UserId).IsRequired().HasMaxLength(200);
            entity.HasIndex(v => new { v.ReviewId, v.UserId }).IsUnique();
        });

        // ---- ProductQuestion ----
        modelBuilder.Entity<ProductQuestion>(entity =>
        {
            entity.HasOne(q => q.Product)
                  .WithMany(p => p.Questions)
                  .HasForeignKey(q => q.ProductId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(q => q.UserId).HasMaxLength(200);
            entity.Property(q => q.UserName).IsRequired().HasMaxLength(200);
            entity.Property(q => q.Email).HasMaxLength(200);
            entity.Property(q => q.Question).IsRequired().HasMaxLength(1000);
            entity.Property(q => q.Answer).HasMaxLength(4000);
            entity.Property(q => q.AnsweredBy).HasMaxLength(200);

            entity.HasIndex(q => q.ProductId);
            entity.HasIndex(q => q.IsApproved);
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
            entity.Property(s => s.Value).HasMaxLength(8000);
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
            entity.Property(b => b.CtaText).HasMaxLength(100);
            entity.Property(b => b.Placement).IsRequired().HasMaxLength(50);

            entity.HasOne(b => b.Category)
                  .WithMany()
                  .HasForeignKey(b => b.CategoryId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(b => new { b.Placement, b.SortOrder });
            entity.HasIndex(b => b.CategoryId);
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

        // ---- Blog ----
        modelBuilder.Entity<BlogCategory>(entity =>
        {
            entity.Property(c => c.Name).IsRequired().HasMaxLength(150);
            entity.Property(c => c.Slug).IsRequired().HasMaxLength(150);
            entity.Property(c => c.Description).HasMaxLength(500);
            entity.HasIndex(c => c.Slug).IsUnique();
        });

        modelBuilder.Entity<BlogTag>(entity =>
        {
            entity.Property(t => t.Name).IsRequired().HasMaxLength(100);
            entity.Property(t => t.Slug).IsRequired().HasMaxLength(100);
            entity.HasIndex(t => t.Slug).IsUnique();
        });

        modelBuilder.Entity<BlogPost>(entity =>
        {
            entity.Property(p => p.Title).IsRequired().HasMaxLength(250);
            entity.Property(p => p.Slug).IsRequired().HasMaxLength(250);
            entity.Property(p => p.Excerpt).HasMaxLength(500);
            entity.Property(p => p.CoverImageUrl).HasMaxLength(500);
            entity.Property(p => p.AuthorName).HasMaxLength(150);
            entity.Property(p => p.MetaTitle).HasMaxLength(200);
            entity.Property(p => p.MetaDescription).HasMaxLength(500);

            entity.HasOne(p => p.BlogCategory)
                  .WithMany(c => c.Posts)
                  .HasForeignKey(p => p.BlogCategoryId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(p => p.Slug).IsUnique();
            entity.HasIndex(p => p.PublishedAt);
            entity.HasIndex(p => p.IsPublished);
        });

        modelBuilder.Entity<BlogPostTag>(entity =>
        {
            entity.HasKey(pt => new { pt.BlogPostId, pt.BlogTagId });

            entity.HasOne(pt => pt.BlogPost)
                  .WithMany(p => p.PostTags)
                  .HasForeignKey(pt => pt.BlogPostId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pt => pt.BlogTag)
                  .WithMany(t => t.PostTags)
                  .HasForeignKey(pt => pt.BlogTagId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BlogComment>(entity =>
        {
            entity.Property(c => c.AuthorName).IsRequired().HasMaxLength(150);
            entity.Property(c => c.AuthorEmail).HasMaxLength(200);
            entity.Property(c => c.Content).IsRequired().HasMaxLength(2000);
            entity.Property(c => c.UserId).HasMaxLength(200);

            entity.HasOne(c => c.BlogPost)
                  .WithMany(p => p.Comments)
                  .HasForeignKey(c => c.BlogPostId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(c => c.BlogPostId);
            entity.HasIndex(c => c.IsApproved);
        });

        // ---- Content modules ----
        modelBuilder.Entity<ContactMessage>(entity =>
        {
            entity.Property(m => m.Name).IsRequired().HasMaxLength(150);
            entity.Property(m => m.Email).IsRequired().HasMaxLength(200);
            entity.Property(m => m.Phone).HasMaxLength(50);
            entity.Property(m => m.Subject).IsRequired().HasMaxLength(250);
            entity.Property(m => m.Message).IsRequired().HasMaxLength(5000);

            entity.HasIndex(m => m.IsRead);
            entity.HasIndex(m => m.CreatedAt);
        });

        modelBuilder.Entity<NewsletterSubscriber>(entity =>
        {
            entity.Property(s => s.Email).IsRequired().HasMaxLength(200);
            entity.Property(s => s.ConfirmToken).HasMaxLength(100);

            entity.HasIndex(s => s.Email).IsUnique();
            entity.HasIndex(s => s.ConfirmToken);
        });

        modelBuilder.Entity<StockNotificationRequest>(entity =>
        {
            entity.Property(r => r.Email).IsRequired().HasMaxLength(200);
            entity.Property(r => r.UserId).HasMaxLength(200);

            entity.HasIndex(r => new { r.ProductId, r.Email, r.IsNotified });
            entity.HasIndex(r => r.IsNotified);
            entity.HasIndex(r => r.CreatedAt);
        });

        modelBuilder.Entity<FaqItem>(entity =>
        {
            entity.Property(f => f.Category).IsRequired().HasMaxLength(100);
            entity.Property(f => f.Question).IsRequired().HasMaxLength(500);
            entity.Property(f => f.Answer).IsRequired();

            entity.HasIndex(f => new { f.IsPublished, f.SortOrder });
            entity.HasIndex(f => f.Category);
        });

        modelBuilder.Entity<SearchQueryLog>(entity =>
        {
            entity.Property(s => s.Query).IsRequired().HasMaxLength(200);
            entity.HasIndex(s => s.Query).IsUnique();
            entity.HasIndex(s => s.HitCount);
        });

        modelBuilder.Entity<Currency>(entity =>
        {
            entity.Property(c => c.Code).IsRequired().HasMaxLength(10);
            entity.Property(c => c.Symbol).IsRequired().HasMaxLength(10);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
            entity.Property(c => c.RateToBase).HasColumnType("numeric(18,6)");

            entity.HasIndex(c => c.Code).IsUnique();
            entity.HasIndex(c => c.IsActive);
            entity.HasIndex(c => c.IsDefault);
        });

        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.Property(w => w.Name).IsRequired().HasMaxLength(200);
            entity.Property(w => w.Code).HasMaxLength(50);
            entity.Property(w => w.Address).HasMaxLength(500);

            entity.HasIndex(w => w.Code);
            entity.HasIndex(w => w.IsActive);
            entity.HasIndex(w => w.IsDefault);
        });

        modelBuilder.Entity<ProductVariantStock>(entity =>
        {
            entity.HasOne(s => s.ProductVariant)
                  .WithMany()
                  .HasForeignKey(s => s.ProductVariantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(s => s.Warehouse)
                  .WithMany(w => w.Stocks)
                  .HasForeignKey(s => s.WarehouseId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(s => new { s.ProductVariantId, s.WarehouseId }).IsUnique();
            entity.HasIndex(s => s.WarehouseId);
        });

        modelBuilder.Entity<AuditLogEntry>(entity =>
        {
            entity.Property(a => a.UserId).IsRequired().HasMaxLength(200);
            entity.Property(a => a.UserName).HasMaxLength(256);
            entity.Property(a => a.Action).IsRequired().HasMaxLength(200);
            entity.Property(a => a.EntityType).HasMaxLength(100);
            entity.Property(a => a.EntityId).HasMaxLength(100);
            entity.Property(a => a.IpAddress).HasMaxLength(64);

            entity.HasIndex(a => a.CreatedAt);
            entity.HasIndex(a => a.UserId);
            entity.HasIndex(a => a.EntityType);
        });

        // ---- NavMenu ----
        modelBuilder.Entity<NavMenu>(entity =>
        {
            entity.Property(m => m.Name).IsRequired().HasMaxLength(100);
            entity.Property(m => m.Location).IsRequired().HasMaxLength(50);
            entity.HasIndex(m => m.Location);
        });

        modelBuilder.Entity<NavMenuItem>(entity =>
        {
            entity.Property(i => i.Label).IsRequired().HasMaxLength(150);
            entity.Property(i => i.Url).HasMaxLength(500);
            entity.Property(i => i.LinkType).IsRequired().HasMaxLength(50);

            entity.HasOne(i => i.NavMenu)
                  .WithMany(m => m.Items)
                  .HasForeignKey(i => i.NavMenuId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(i => i.Parent)
                  .WithMany(i => i.Children)
                  .HasForeignKey(i => i.ParentId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(i => new { i.NavMenuId, i.SortOrder });
            entity.HasIndex(i => i.ParentId);
        });

        // ---- Customer CRM ----
        modelBuilder.Entity<CustomerSegment>(entity =>
        {
            entity.Property(s => s.Name).IsRequired().HasMaxLength(100);
            entity.Property(s => s.Description).HasMaxLength(500);
            entity.Property(s => s.Color).HasMaxLength(20);
            entity.HasIndex(s => s.Name).IsUnique();
        });

        modelBuilder.Entity<CustomerSegmentMember>(entity =>
        {
            entity.HasKey(m => new { m.SegmentId, m.UserId });
            entity.Property(m => m.UserId).IsRequired().HasMaxLength(200);

            entity.HasOne(m => m.Segment)
                  .WithMany(s => s.Members)
                  .HasForeignKey(m => m.SegmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(m => m.UserId);
        });

        modelBuilder.Entity<CustomerNote>(entity =>
        {
            entity.Property(n => n.UserId).IsRequired().HasMaxLength(200);
            entity.Property(n => n.Note).IsRequired().HasMaxLength(2000);
            entity.Property(n => n.CreatedByUserId).HasMaxLength(200);
            entity.Property(n => n.CreatedByName).HasMaxLength(200);
            entity.HasIndex(n => n.UserId);
            entity.HasIndex(n => n.CreatedAt);
        });
    }
}
