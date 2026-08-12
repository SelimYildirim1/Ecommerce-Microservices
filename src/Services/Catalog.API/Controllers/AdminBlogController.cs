using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

public record SaveBlogCategoryRequest(string Name, string? Slug, string? Description, int SortOrder = 0);
public record SaveBlogTagRequest(string Name, string? Slug);
public record SaveBlogPostRequest(
    string Title,
    string? Slug,
    string? Excerpt,
    string? Content,
    string? CoverImageUrl,
    string? AuthorName,
    int? ReadingTimeMinutes,
    bool IsPublished,
    bool IsFeatured,
    DateTime? PublishedAt,
    string? MetaTitle,
    string? MetaDescription,
    Guid? BlogCategoryId,
    List<Guid>? TagIds);
public record ModerateCommentRequest(bool IsApproved);

[Route("api/admin/blog")]
[ApiController]
public class AdminBlogController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminBlogController(CatalogDbContext context)
    {
        _context = context;
    }

    // --- Categories ---

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var items = await _context.BlogCategories
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Slug,
                c.Description,
                c.SortOrder,
                postCount = c.Posts.Count
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory([FromBody] SaveBlogCategoryRequest req)
    {
        var slug = await UniqueBlogCategorySlug(SlugHelper.Slugify(req.Slug, req.Name));
        var cat = new BlogCategory
        {
            Name = req.Name.Trim(),
            Slug = slug,
            Description = req.Description?.Trim(),
            SortOrder = req.SortOrder
        };
        _context.BlogCategories.Add(cat);
        await _context.SaveChangesAsync();
        return Ok(cat);
    }

    [HttpPut("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] SaveBlogCategoryRequest req)
    {
        var cat = await _context.BlogCategories.FindAsync(id);
        if (cat is null) return NotFound();

        cat.Name = req.Name.Trim();
        cat.Slug = await UniqueBlogCategorySlug(SlugHelper.Slugify(req.Slug, req.Name), id);
        cat.Description = req.Description?.Trim();
        cat.SortOrder = req.SortOrder;
        cat.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(cat);
    }

    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var cat = await _context.BlogCategories.Include(c => c.Posts).FirstOrDefaultAsync(c => c.Id == id);
        if (cat is null) return NotFound();
        if (cat.Posts.Any()) return BadRequest("Yazıları olan kategori silinemez.");

        _context.BlogCategories.Remove(cat);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // --- Tags ---

    [HttpGet("tags")]
    public async Task<IActionResult> GetTags()
    {
        return Ok(await _context.BlogTags.AsNoTracking().OrderBy(t => t.Name).ToListAsync());
    }

    [HttpPost("tags")]
    public async Task<IActionResult> CreateTag([FromBody] SaveBlogTagRequest req)
    {
        var slug = await UniqueBlogTagSlug(SlugHelper.Slugify(req.Slug, req.Name));
        var tag = new BlogTag { Name = req.Name.Trim(), Slug = slug };
        _context.BlogTags.Add(tag);
        await _context.SaveChangesAsync();
        return Ok(tag);
    }

    [HttpDelete("tags/{id:guid}")]
    public async Task<IActionResult> DeleteTag(Guid id)
    {
        var tag = await _context.BlogTags.FindAsync(id);
        if (tag is null) return NotFound();
        _context.BlogTags.Remove(tag);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // --- Posts ---

    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts([FromQuery] string? q, [FromQuery] string? status)
    {
        var query = _context.BlogPosts
            .AsNoTracking()
            .Include(p => p.BlogCategory)
            .Include(p => p.PostTags).ThenInclude(pt => pt.BlogTag)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(p => p.Title.Contains(q) || (p.Excerpt != null && p.Excerpt.Contains(q)));

        if (status == "published") query = query.Where(p => p.IsPublished);
        else if (status == "draft") query = query.Where(p => !p.IsPublished);

        var posts = await query
            .OrderByDescending(p => p.PublishedAt ?? p.CreatedAt)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Slug,
                p.Excerpt,
                p.CoverImageUrl,
                p.AuthorName,
                p.IsPublished,
                p.IsFeatured,
                p.PublishedAt,
                p.ViewCount,
                p.ReadingTimeMinutes,
                category = p.BlogCategory == null ? null : new { p.BlogCategory.Id, p.BlogCategory.Name },
                tags = p.PostTags.Select(t => new { t.BlogTag.Id, t.BlogTag.Name }).ToList()
            })
            .ToListAsync();

        return Ok(posts);
    }

    [HttpGet("posts/{id:guid}")]
    public async Task<IActionResult> GetPost(Guid id)
    {
        var post = await _context.BlogPosts
            .AsNoTracking()
            .Include(p => p.PostTags)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (post is null) return NotFound();

        return Ok(new
        {
            post.Id,
            post.Title,
            post.Slug,
            post.Excerpt,
            post.Content,
            post.CoverImageUrl,
            post.AuthorName,
            post.ReadingTimeMinutes,
            post.IsPublished,
            post.IsFeatured,
            post.PublishedAt,
            post.MetaTitle,
            post.MetaDescription,
            post.ViewCount,
            post.BlogCategoryId,
            tagIds = post.PostTags.Select(t => t.BlogTagId).ToList()
        });
    }

    [HttpPost("posts")]
    public async Task<IActionResult> CreatePost([FromBody] SaveBlogPostRequest req)
    {
        var post = new BlogPost();
        await ApplyPost(post, req);
        _context.BlogPosts.Add(post);
        await _context.SaveChangesAsync();
        await SyncTags(post.Id, req.TagIds);
        return Ok(new { post.Id, post.Slug });
    }

    [HttpPut("posts/{id:guid}")]
    public async Task<IActionResult> UpdatePost(Guid id, [FromBody] SaveBlogPostRequest req)
    {
        var post = await _context.BlogPosts.FindAsync(id);
        if (post is null) return NotFound();

        await ApplyPost(post, req, id);
        post.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await SyncTags(post.Id, req.TagIds);
        return Ok(new { post.Id, post.Slug });
    }

    [HttpDelete("posts/{id:guid}")]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        var post = await _context.BlogPosts.FindAsync(id);
        if (post is null) return NotFound();
        _context.BlogPosts.Remove(post);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("posts/publish")]
    public async Task<IActionResult> BulkPublish([FromBody] List<Guid> ids)
    {
        var posts = await _context.BlogPosts.Where(p => ids.Contains(p.Id)).ToListAsync();
        foreach (var post in posts)
        {
            post.IsPublished = true;
            post.PublishedAt ??= DateTime.UtcNow;
            post.UpdatedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();
        return Ok(new { count = posts.Count });
    }

    // --- Comments ---

    [HttpGet("comments")]
    public async Task<IActionResult> GetComments([FromQuery] bool? approved)
    {
        var query = _context.BlogComments
            .AsNoTracking()
            .Include(c => c.BlogPost)
            .AsQueryable();

        if (approved.HasValue)
            query = query.Where(c => c.IsApproved == approved.Value);

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.AuthorName,
                c.AuthorEmail,
                c.Content,
                c.IsApproved,
                c.CreatedAt,
                post = new { c.BlogPost.Id, c.BlogPost.Title, c.BlogPost.Slug }
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPut("comments/{id:guid}/moderate")]
    public async Task<IActionResult> ModerateComment(Guid id, [FromBody] ModerateCommentRequest req)
    {
        var comment = await _context.BlogComments.FindAsync(id);
        if (comment is null) return NotFound();

        comment.IsApproved = req.IsApproved;
        comment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(comment);
    }

    [HttpDelete("comments/{id:guid}")]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        var comment = await _context.BlogComments.FindAsync(id);
        if (comment is null) return NotFound();
        _context.BlogComments.Remove(comment);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private async Task ApplyPost(BlogPost post, SaveBlogPostRequest req, Guid? excludeId = null)
    {
        post.Title = req.Title.Trim();
        post.Slug = await UniqueBlogPostSlug(SlugHelper.Slugify(req.Slug, req.Title), excludeId);
        post.Excerpt = req.Excerpt?.Trim();
        post.Content = req.Content ?? string.Empty;
        post.CoverImageUrl = string.IsNullOrWhiteSpace(req.CoverImageUrl) ? null : req.CoverImageUrl.Trim();
        post.AuthorName = string.IsNullOrWhiteSpace(req.AuthorName) ? "Yıldırım Store" : req.AuthorName.Trim();
        post.ReadingTimeMinutes = req.ReadingTimeMinutes
            ?? Math.Max(1, post.Content.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length / 200);
        post.IsPublished = req.IsPublished;
        post.IsFeatured = req.IsFeatured;
        post.PublishedAt = req.IsPublished
            ? (req.PublishedAt ?? post.PublishedAt ?? DateTime.UtcNow)
            : req.PublishedAt;
        post.MetaTitle = req.MetaTitle?.Trim();
        post.MetaDescription = req.MetaDescription?.Trim();
        post.BlogCategoryId = req.BlogCategoryId;
    }

    private async Task SyncTags(Guid postId, List<Guid>? tagIds)
    {
        var existing = await _context.BlogPostTags.Where(t => t.BlogPostId == postId).ToListAsync();
        _context.BlogPostTags.RemoveRange(existing);

        if (tagIds is { Count: > 0 })
        {
            foreach (var tagId in tagIds.Distinct())
            {
                _context.BlogPostTags.Add(new BlogPostTag
                {
                    BlogPostId = postId,
                    BlogTagId = tagId
                });
            }
        }

        await _context.SaveChangesAsync();
    }

    private async Task<string> UniqueBlogPostSlug(string slug, Guid? excludeId = null)
    {
        if (string.IsNullOrWhiteSpace(slug)) slug = "yazi";
        var candidate = slug;
        var i = 2;
        while (await _context.BlogPosts.AnyAsync(p =>
                   p.Slug == candidate && (!excludeId.HasValue || p.Id != excludeId.Value)))
            candidate = $"{slug}-{i++}";
        return candidate;
    }

    private async Task<string> UniqueBlogCategorySlug(string slug, Guid? excludeId = null)
    {
        if (string.IsNullOrWhiteSpace(slug)) slug = "kategori";
        var candidate = slug;
        var i = 2;
        while (await _context.BlogCategories.AnyAsync(c =>
                   c.Slug == candidate && (!excludeId.HasValue || c.Id != excludeId.Value)))
            candidate = $"{slug}-{i++}";
        return candidate;
    }

    private async Task<string> UniqueBlogTagSlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug)) slug = "etiket";
        var candidate = slug;
        var i = 2;
        while (await _context.BlogTags.AnyAsync(t => t.Slug == candidate))
            candidate = $"{slug}-{i++}";
        return candidate;
    }
}
