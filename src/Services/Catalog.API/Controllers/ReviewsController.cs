using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

/// <summary>
/// Urun yorumlari. Vitrin yalnizca onayli yorumlari gorur; admin tarafi
/// AdminReviewsController uzerinden moderasyon yapar.
/// Kimlik, basket akisindaki gibi istek govdesindeki userId ile tasinir.
/// </summary>
[Route("api/products/{productId:guid}/reviews")]
[ApiController]
public class ReviewsController : ControllerBase
{
    private readonly CatalogDbContext _context;
    private readonly ILogger<ReviewsController> _logger;

    public ReviewsController(CatalogDbContext context, ILogger<ReviewsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>Urune ait onayli yorumlar.</summary>
    [HttpGet]
    public async Task<ActionResult<List<ReviewDto>>> GetForProduct(
        Guid productId, [FromQuery] bool includePending = false)
    {
        var query = _context.ProductReviews
            .AsNoTracking()
            .Where(r => r.ProductId == productId);

        if (!includePending)
            query = query.Where(r => r.IsApproved);

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return Ok(reviews.Select(ReviewMapper.ToDto).ToList());
    }

    /// <summary>Puan dagilimi ve ortalama.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ReviewSummaryDto>> GetSummary(Guid productId)
    {
        var ratings = await _context.ProductReviews
            .AsNoTracking()
            .Where(r => r.ProductId == productId && r.IsApproved)
            .Select(r => r.Rating)
            .ToListAsync();

        var distribution = Enumerable.Range(1, 5)
            .ToDictionary(star => star, star => ratings.Count(r => r == star));

        return Ok(new ReviewSummaryDto(
            productId,
            ratings.Count > 0 ? Math.Round(ratings.Average(), 2) : 0,
            ratings.Count,
            distribution));
    }

    /// <summary>Musteri yorumu birakir. Onaya duser.</summary>
    [HttpPost]
    public async Task<ActionResult<ReviewDto>> Create(
        Guid productId, [FromBody] CreateReviewRequest request)
    {
        if (request.Rating is < 1 or > 5)
            return BadRequest("Puan 1 ile 5 arasında olmalı.");

        var userId = (request.UserId ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest("Yorum bırakmak için giriş yapmalısınız.");

        var productExists = await _context.Products.AnyAsync(p => p.Id == productId);
        if (!productExists) return NotFound("Ürün bulunamadı.");

        var existing = await _context.ProductReviews
            .FirstOrDefaultAsync(r => r.ProductId == productId && r.UserId == userId);

        // Ayni kullanici yeniden yorum yazarsa mevcut yorumu guncellenir
        if (existing is not null)
        {
            existing.Rating = request.Rating;
            existing.Title = request.Title?.Trim();
            existing.Comment = request.Comment?.Trim();
            existing.IsApproved = false;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ReviewMapper.ToDto(existing));
        }

        var review = new ProductReview
        {
            ProductId = productId,
            UserId = userId,
            UserName = string.IsNullOrWhiteSpace(request.UserName) ? "Müşteri" : request.UserName.Trim(),
            Rating = request.Rating,
            Title = request.Title?.Trim(),
            Comment = request.Comment?.Trim(),
            IsApproved = false
        };

        _context.ProductReviews.Add(review);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Yeni yorum: ürün {ProductId}, kullanıcı {UserId}", productId, userId);

        return Ok(ReviewMapper.ToDto(review));
    }

    /// <summary>Kullanici kendi yorumunu siler.</summary>
    [HttpDelete("{reviewId:guid}")]
    public async Task<IActionResult> Delete(Guid productId, Guid reviewId, [FromQuery] string? userId)
    {
        var review = await _context.ProductReviews
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.ProductId == productId);

        if (review is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(userId) && review.UserId != userId)
            return Forbid();

        _context.ProductReviews.Remove(review);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

/// <summary>Panel tarafi yorum moderasyonu.</summary>
[Route("api/admin/reviews")]
[ApiController]
public class AdminReviewsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminReviewsController(CatalogDbContext context)
    {
        _context = context;
    }

    /// <summary>Tum yorumlar. approved=false ile bekleyenler filtrelenir.</summary>
    [HttpGet]
    public async Task<ActionResult<List<object>>> GetAll(
        [FromQuery] bool? approved, [FromQuery] Guid? productId)
    {
        var query = _context.ProductReviews
            .AsNoTracking()
            .Include(r => r.Product)
            .AsQueryable();

        if (approved.HasValue)
            query = query.Where(r => r.IsApproved == approved.Value);

        if (productId.HasValue)
            query = query.Where(r => r.ProductId == productId.Value);

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var result = reviews.Select(r => new
        {
            r.Id,
            r.ProductId,
            ProductName = r.Product?.Name ?? string.Empty,
            r.UserId,
            r.UserName,
            r.Rating,
            r.Title,
            r.Comment,
            r.IsApproved,
            r.ModeratorNote,
            r.CreatedAt
        }).ToList();

        return Ok(result);
    }

    [HttpPut("{id:guid}/moderate")]
    public async Task<IActionResult> Moderate(Guid id, [FromBody] ModerateReviewRequest request)
    {
        var review = await _context.ProductReviews.FindAsync(id);
        if (review is null) return NotFound();

        review.IsApproved = request.IsApproved;
        review.ModeratorNote = request.ModeratorNote?.Trim();
        review.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(ReviewMapper.ToDto(review));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var review = await _context.ProductReviews.FindAsync(id);
        if (review is null) return NotFound();

        _context.ProductReviews.Remove(review);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
