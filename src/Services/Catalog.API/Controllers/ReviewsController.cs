using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Models;
using Catalog.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

/// <summary>
/// Urun yorumlari. Vitrin yalnizca onayli yorumlari gorur; admin tarafi
/// AdminReviewsController uzerinden moderasyon yapar.
/// </summary>
[Route("api/products/{productId:guid}/reviews")]
[ApiController]
public class ReviewsController : ControllerBase
{
    private readonly CatalogDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ReviewsController> _logger;

    public ReviewsController(
        CatalogDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ReviewsController> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>Urune ait onayli yorumlar. sort=newest|helpful|rating, rating=1-5 filtresi.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<ReviewDto>>> GetForProduct(
        Guid productId,
        [FromQuery] bool includePending = false,
        [FromQuery] string sort = "newest",
        [FromQuery] int? rating = null)
    {
        var query = _context.ProductReviews
            .AsNoTracking()
            .Where(r => r.ProductId == productId);

        if (!includePending)
            query = query.Where(r => r.IsApproved);

        if (rating is >= 1 and <= 5)
            query = query.Where(r => r.Rating == rating.Value);

        query = sort.ToLowerInvariant() switch
        {
            "helpful" => query.OrderByDescending(r => r.HelpfulCount).ThenByDescending(r => r.CreatedAt),
            "rating" => query.OrderByDescending(r => r.Rating).ThenByDescending(r => r.CreatedAt),
            _ => query.OrderByDescending(r => r.CreatedAt)
        };

        var reviews = await query.ToListAsync();
        return Ok(reviews.Select(ReviewMapper.ToDto).ToList());
    }

    /// <summary>Puan dagilimi ve ortalama.</summary>
    [HttpGet("summary")]
    [AllowAnonymous]
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
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<ReviewDto>> Create(
        Guid productId, [FromBody] CreateReviewRequest request)
    {
        if (request.Rating is < 1 or > 5)
            return BadRequest("Puan 1 ile 5 arasında olmalı.");

        var tokenUserId = CallerIdentity.GetUserId(User);
        if (string.IsNullOrWhiteSpace(tokenUserId))
            return Unauthorized();

        if (!string.IsNullOrWhiteSpace(request.UserId)
            && !CallerIdentity.CanAccessUser(User, request.UserId.Trim()))
            return Forbid();

        var userId = CallerIdentity.IsAdmin(User) && !string.IsNullOrWhiteSpace(request.UserId)
            ? request.UserId.Trim()
            : tokenUserId;

        var productExists = await _context.Products.AnyAsync(p => p.Id == productId);
        if (!productExists) return NotFound("Ürün bulunamadı.");

        var verified = request.IsVerifiedPurchase == true
            || await CheckPurchasedAsync(userId, productId);

        var imageJson = ReviewMapper.SerializeImageUrls(request.ImageUrls);

        var existing = await _context.ProductReviews
            .FirstOrDefaultAsync(r => r.ProductId == productId && r.UserId == userId);

        if (existing is not null)
        {
            existing.Rating = request.Rating;
            existing.Title = request.Title?.Trim();
            existing.Comment = request.Comment?.Trim();
            existing.ImageUrls = imageJson;
            existing.IsVerifiedPurchase = verified || existing.IsVerifiedPurchase;
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
            ImageUrls = imageJson,
            IsVerifiedPurchase = verified,
            IsApproved = false
        };

        _context.ProductReviews.Add(review);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Yeni yorum: ürün {ProductId}, kullanıcı {UserId}", productId, userId);

        return Ok(ReviewMapper.ToDto(review));
    }

    /// <summary>Yoruma faydalı / faydasız oyu.</summary>
    [Authorize]
    [HttpPost("{reviewId:guid}/vote")]
    public async Task<ActionResult<ReviewDto>> Vote(
        Guid productId, Guid reviewId, [FromBody] VoteReviewRequest request)
    {
        var userId = CallerIdentity.GetUserId(User);
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized();

        var review = await _context.ProductReviews
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.ProductId == productId && r.IsApproved);

        if (review is null) return NotFound("Yorum bulunamadı.");

        var existing = await _context.ReviewVotes
            .FirstOrDefaultAsync(v => v.ReviewId == reviewId && v.UserId == userId);

        if (existing is not null)
        {
            if (existing.IsHelpful == request.IsHelpful)
                return Ok(ReviewMapper.ToDto(review));

            // Oy değişimi
            if (existing.IsHelpful)
            {
                review.HelpfulCount = Math.Max(0, review.HelpfulCount - 1);
                review.NotHelpfulCount++;
            }
            else
            {
                review.NotHelpfulCount = Math.Max(0, review.NotHelpfulCount - 1);
                review.HelpfulCount++;
            }

            existing.IsHelpful = request.IsHelpful;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.ReviewVotes.Add(new ReviewVote
            {
                ReviewId = reviewId,
                UserId = userId,
                IsHelpful = request.IsHelpful
            });

            if (request.IsHelpful) review.HelpfulCount++;
            else review.NotHelpfulCount++;
        }

        review.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ReviewMapper.ToDto(review));
    }

    /// <summary>Kullanici kendi yorumunu siler.</summary>
    [Authorize]
    [HttpDelete("{reviewId:guid}")]
    public async Task<IActionResult> Delete(Guid productId, Guid reviewId, [FromQuery] string? userId)
    {
        var review = await _context.ProductReviews
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.ProductId == productId);

        if (review is null) return NotFound();

        var tokenUserId = CallerIdentity.GetUserId(User);
        if (string.IsNullOrWhiteSpace(tokenUserId))
            return Unauthorized();

        if (!string.IsNullOrWhiteSpace(userId)
            && !CallerIdentity.CanAccessUser(User, userId))
            return Forbid();

        if (!CallerIdentity.CanAccessUser(User, review.UserId))
            return Forbid();

        _context.ProductReviews.Remove(review);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<bool> CheckPurchasedAsync(string buyerId, Guid productId)
    {
        var orderBase = _configuration["Services:Order"] ?? "http://order-api:8080";
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(3);
            var auth = Request.Headers.Authorization.ToString();
            if (!string.IsNullOrWhiteSpace(auth))
                client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", auth);

            var response = await client.GetAsync(
                $"{orderBase.TrimEnd('/')}/api/orders/{Uri.EscapeDataString(buyerId)}/purchased/{productId}");

            if (!response.IsSuccessStatusCode) return false;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty("purchased", out var p) && p.GetBoolean();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Satın alma doğrulaması başarısız (Order.API).");
            return false;
        }
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
            r.IsVerifiedPurchase,
            r.HelpfulCount,
            r.NotHelpfulCount,
            ImageUrls = ReviewMapper.ParseImageUrls(r.ImageUrls),
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
