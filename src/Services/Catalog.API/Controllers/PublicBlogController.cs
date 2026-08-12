using Catalog.API.Data;
using Catalog.API.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

public record CreateBlogCommentRequest(
    string AuthorName,
    string? AuthorEmail,
    string Content,
    string? UserId);

[Route("api/blog")]
[ApiController]
public class PublicBlogController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public PublicBlogController(CatalogDbContext context)
    {
        _context = context;
    }

    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        [FromQuery] string? category = null,
        [FromQuery] string? tag = null,
        [FromQuery] string? q = null,
        [FromQuery] string? sort = null,
        [FromQuery] bool featuredOnly = false)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.BlogPosts
            .AsNoTracking()
            .Where(p => p.IsPublished && p.PublishedAt != null && p.PublishedAt <= DateTime.UtcNow);

        if (featuredOnly) query = query.Where(p => p.IsFeatured);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.BlogCategory != null && p.BlogCategory.Slug == category);

        if (!string.IsNullOrWhiteSpace(tag))
            query = query.Where(p => p.PostTags.Any(t => t.BlogTag.Slug == tag));

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(p =>
                p.Title.Contains(term) ||
                (p.Excerpt != null && p.Excerpt.Contains(term)) ||
                p.Content.Contains(term) ||
                (p.AuthorName != null && p.AuthorName.Contains(term)));
        }

        var total = await query.CountAsync();

        var ordered = string.Equals(sort, "popular", StringComparison.OrdinalIgnoreCase)
            ? query.OrderByDescending(p => p.ViewCount).ThenByDescending(p => p.PublishedAt)
            : query.OrderByDescending(p => p.PublishedAt);

        var items = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Slug,
                p.Excerpt,
                p.CoverImageUrl,
                p.AuthorName,
                p.ReadingTimeMinutes,
                p.PublishedAt,
                p.IsFeatured,
                p.ViewCount,
                category = p.BlogCategory == null
                    ? null
                    : new { p.BlogCategory.Name, p.BlogCategory.Slug },
                tags = p.PostTags.Select(t => new { t.BlogTag.Name, t.BlogTag.Slug }).ToList()
            })
            .ToListAsync();

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    [HttpGet("posts/{slug}")]
    public async Task<IActionResult> GetPost(string slug)
    {
        var post = await _context.BlogPosts
            .Include(p => p.BlogCategory)
            .Include(p => p.PostTags).ThenInclude(pt => pt.BlogTag)
            .FirstOrDefaultAsync(p =>
                p.Slug == slug &&
                p.IsPublished &&
                p.PublishedAt != null &&
                p.PublishedAt <= DateTime.UtcNow);

        if (post is null) return NotFound();

        post.ViewCount += 1;
        await _context.SaveChangesAsync();

        var related = await _context.BlogPosts
            .AsNoTracking()
            .Where(p =>
                p.Id != post.Id &&
                p.IsPublished &&
                p.PublishedAt != null &&
                p.PublishedAt <= DateTime.UtcNow &&
                (post.BlogCategoryId == null || p.BlogCategoryId == post.BlogCategoryId))
            .OrderByDescending(p => p.PublishedAt)
            .Take(3)
            .Select(p => new
            {
                p.Title,
                p.Slug,
                p.Excerpt,
                p.CoverImageUrl,
                p.PublishedAt,
                p.ReadingTimeMinutes
            })
            .ToListAsync();

        var comments = await _context.BlogComments
            .AsNoTracking()
            .Where(c => c.BlogPostId == post.Id && c.IsApproved)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.AuthorName,
                c.Content,
                c.CreatedAt
            })
            .ToListAsync();

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
            post.PublishedAt,
            post.MetaTitle,
            post.MetaDescription,
            post.ViewCount,
            post.IsFeatured,
            category = post.BlogCategory == null
                ? null
                : new { post.BlogCategory.Name, post.BlogCategory.Slug },
            tags = post.PostTags.Select(t => new { t.BlogTag.Name, t.BlogTag.Slug }).ToList(),
            related,
            comments
        });
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var items = await _context.BlogCategories
            .AsNoTracking()
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new
            {
                c.Name,
                c.Slug,
                c.Description,
                postCount = c.Posts.Count(p =>
                    p.IsPublished && p.PublishedAt != null && p.PublishedAt <= DateTime.UtcNow)
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("tags")]
    public async Task<IActionResult> GetTags()
    {
        var items = await _context.BlogTags
            .AsNoTracking()
            .OrderBy(t => t.Name)
            .Select(t => new
            {
                t.Name,
                t.Slug,
                postCount = t.PostTags.Count(pt =>
                    pt.BlogPost.IsPublished &&
                    pt.BlogPost.PublishedAt != null &&
                    pt.BlogPost.PublishedAt <= DateTime.UtcNow)
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("posts/{slug}/comments")]
    public async Task<IActionResult> CreateComment(string slug, [FromBody] CreateBlogCommentRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.AuthorName) || string.IsNullOrWhiteSpace(req.Content))
            return BadRequest("Ad ve yorum zorunludur.");

        var post = await _context.BlogPosts.FirstOrDefaultAsync(p =>
            p.Slug == slug && p.IsPublished);

        if (post is null) return NotFound();

        var comment = new BlogComment
        {
            BlogPostId = post.Id,
            AuthorName = req.AuthorName.Trim(),
            AuthorEmail = req.AuthorEmail?.Trim(),
            Content = req.Content.Trim(),
            UserId = req.UserId,
            IsApproved = false
        };

        _context.BlogComments.Add(comment);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Yorumunuz alındı. Onaylandıktan sonra yayınlanacak." });
    }
}
