using System.Text.Json;
using Catalog.API.Entities;

namespace Catalog.API.Models;

public record CreateReviewRequest(
    int Rating,
    string? Title,
    string? Comment,
    string? UserId = null,
    string? UserName = null,
    IReadOnlyList<string>? ImageUrls = null,
    bool? IsVerifiedPurchase = null);

public record ModerateReviewRequest(bool IsApproved, string? ModeratorNote);

public record VoteReviewRequest(bool IsHelpful);

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
    bool IsVerifiedPurchase,
    int HelpfulCount,
    int NotHelpfulCount,
    IReadOnlyList<string> ImageUrls,
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
        r.IsVerifiedPurchase,
        r.HelpfulCount,
        r.NotHelpfulCount,
        ParseImageUrls(r.ImageUrls),
        r.CreatedAt);

    public static string? SerializeImageUrls(IReadOnlyList<string>? urls)
    {
        if (urls is null || urls.Count == 0) return null;
        var cleaned = urls
            .Where(u => !string.IsNullOrWhiteSpace(u))
            .Select(u => u.Trim())
            .Take(6)
            .ToList();
        return cleaned.Count == 0 ? null : JsonSerializer.Serialize(cleaned);
    }

    public static IReadOnlyList<string> ParseImageUrls(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<string>();
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }
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

public record CreateQuestionRequest(
    string Question,
    string? UserName = null,
    string? Email = null,
    string? UserId = null);

public record AnswerQuestionRequest(string Answer);

public record ModerateQuestionRequest(bool IsApproved);

public record QuestionDto(
    Guid Id,
    Guid ProductId,
    string? UserId,
    string UserName,
    string? Email,
    string Question,
    string? Answer,
    string? AnsweredBy,
    DateTime? AnsweredAt,
    bool IsApproved,
    DateTime CreatedAt);

public static class QuestionMapper
{
    public static QuestionDto ToDto(ProductQuestion q) => new(
        q.Id,
        q.ProductId,
        q.UserId,
        q.UserName,
        q.Email,
        q.Question,
        q.Answer,
        q.AnsweredBy,
        q.AnsweredAt,
        q.IsApproved,
        q.CreatedAt);
}
