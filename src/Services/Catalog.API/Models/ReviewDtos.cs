using Catalog.API.Entities;

namespace Catalog.API.Models;

public record CreateReviewRequest(
    int Rating,
    string? Title,
    string? Comment,
    string? UserId = null,
    string? UserName = null);

public record ModerateReviewRequest(bool IsApproved, string? ModeratorNote);

public record ReviewDto(
    Guid Id,
    Guid ProductId,
    string UserId,
    string UserName,
    int Rating,
    string? Title,
    string? Comment,
    bool IsApproved,
    string? ModeratorNote,
    DateTime CreatedAt);

/// <summary>Urun detayinda gosterilen puan ozeti.</summary>
public record ReviewSummaryDto(
    Guid ProductId,
    double AverageRating,
    int TotalCount,
    Dictionary<int, int> Distribution);

public static class ReviewMapper
{
    public static ReviewDto ToDto(ProductReview r) => new(
        r.Id,
        r.ProductId,
        r.UserId,
        r.UserName,
        r.Rating,
        r.Title,
        r.Comment,
        r.IsApproved,
        r.ModeratorNote,
        r.CreatedAt);
}

public record FavoriteDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string? PrimaryImageUrl,
    decimal Price,
    bool IsActive,
    DateTime CreatedAt);

public record ToggleFavoriteRequest(Guid ProductId, string? UserId = null);
