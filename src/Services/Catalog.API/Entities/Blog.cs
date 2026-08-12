namespace Catalog.API.Entities;

public class BlogCategory : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? Description { get; set; }
    public int SortOrder { get; set; }

    public ICollection<BlogPost> Posts { get; set; } = new List<BlogPost>();
}

public class BlogTag : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;

    public ICollection<BlogPostTag> PostTags { get; set; } = new List<BlogPostTag>();
}

public class BlogPost : BaseEntity
{
    public string Title { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? Excerpt { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string? AuthorName { get; set; }
    public int ReadingTimeMinutes { get; set; }
    public bool IsPublished { get; set; }
    public bool IsFeatured { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public int ViewCount { get; set; }

    public Guid? BlogCategoryId { get; set; }
    public BlogCategory? BlogCategory { get; set; }

    public ICollection<BlogPostTag> PostTags { get; set; } = new List<BlogPostTag>();
    public ICollection<BlogComment> Comments { get; set; } = new List<BlogComment>();
}

public class BlogPostTag
{
    public Guid BlogPostId { get; set; }
    public BlogPost BlogPost { get; set; } = default!;

    public Guid BlogTagId { get; set; }
    public BlogTag BlogTag { get; set; } = default!;
}

public class BlogComment : BaseEntity
{
    public Guid BlogPostId { get; set; }
    public BlogPost BlogPost { get; set; } = default!;

    public string? UserId { get; set; }
    public string AuthorName { get; set; } = default!;
    public string? AuthorEmail { get; set; }
    public string Content { get; set; } = default!;
    public bool IsApproved { get; set; }
}
