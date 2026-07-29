using Order.API.Entities;

namespace Order.API.Models;

public record CreateReturnItemRequest(Guid OrderItemId, int Units);

public record CreateReturnRequest(
    ReturnReason Reason,
    string? ReasonDetail,
    List<CreateReturnItemRequest>? Items);

public record ResolveReturnRequest(string? AdminNote, decimal? RefundAmount);

public record CancelOrderRequest(string? Reason);

public record ReturnItemDto(
    Guid Id,
    Guid OrderItemId,
    Guid ProductId,
    string ProductName,
    decimal UnitPrice,
    int Units);

public record ReturnRequestDto(
    Guid Id,
    Guid OrderId,
    string BuyerId,
    string RequestNumber,
    ReturnReason Reason,
    string ReasonName,
    string? ReasonDetail,
    ReturnStatus Status,
    string StatusName,
    decimal RefundAmount,
    string? AdminNote,
    DateTime RequestedAt,
    DateTime? ResolvedAt,
    DateTime? RefundedAt,
    List<ReturnItemDto> Items);

public static class ReturnLabels
{
    private static readonly Dictionary<ReturnReason, string> Reasons = new()
    {
        [ReturnReason.Other] = "Diğer",
        [ReturnReason.Defective] = "Ürün arızalı",
        [ReturnReason.WrongItem] = "Yanlış ürün gönderildi",
        [ReturnReason.NotAsDescribed] = "Açıklamayla uyuşmuyor",
        [ReturnReason.SizeIssue] = "Beden/ölçü uymadı",
        [ReturnReason.ChangedMind] = "Fikir değişikliği",
        [ReturnReason.LateDelivery] = "Geç teslimat",
        [ReturnReason.Damaged] = "Hasarlı teslim edildi"
    };

    private static readonly Dictionary<ReturnStatus, string> Statuses = new()
    {
        [ReturnStatus.Pending] = "Onay bekliyor",
        [ReturnStatus.Approved] = "Onaylandı",
        [ReturnStatus.Rejected] = "Reddedildi",
        [ReturnStatus.Refunded] = "İadesi yapıldı",
        [ReturnStatus.Cancelled] = "İptal edildi"
    };

    public static string Of(ReturnReason reason) =>
        Reasons.TryGetValue(reason, out var name) ? name : reason.ToString();

    public static string Of(ReturnStatus status) =>
        Statuses.TryGetValue(status, out var name) ? name : status.ToString();

    public static ReturnRequestDto ToDto(ReturnRequest r) => new(
        r.Id,
        r.OrderId,
        r.BuyerId,
        r.RequestNumber,
        r.Reason,
        Of(r.Reason),
        r.ReasonDetail,
        r.Status,
        Of(r.Status),
        r.RefundAmount,
        r.AdminNote,
        r.RequestedAt,
        r.ResolvedAt,
        r.RefundedAt,
        r.Items.Select(i => new ReturnItemDto(
            i.Id, i.OrderItemId, i.ProductId, i.ProductName, i.UnitPrice, i.Units)).ToList());
}
