using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Order.API.Entities;
using Order.API.Hubs;
using Order.API.Models;
using Order.API.Security;
using Order.API.Services;

namespace Order.API.Controllers;

/// <summary>
/// Iade ve iptal akisi. Musteri talep acar, admin onaylar/reddeder ve
/// geri odemeyi isaretler. Mevcut sipariş endpoint'leri degismez.
/// </summary>
[Route("api/orders/returns")]
[ApiController]
[Authorize]
public class ReturnsController : ControllerBase
{
    /// <summary>Iade talebi acilabilecek siparis durumlari.</summary>
    private static readonly string[] ReturnableStatuses = { "Paid", "Shipped", "Delivered" };

    /// <summary>Iptal edilebilecek siparis durumlari.</summary>
    private static readonly string[] CancellableStatuses = { "Submitted", "Paid" };

    private readonly OrderDbContext _context;
    private readonly ILogger<ReturnsController> _logger;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IHubContext<OrderStatusHub> _hubContext;

    public ReturnsController(
        OrderDbContext context,
        ILogger<ReturnsController> logger,
        IPublishEndpoint publishEndpoint,
        IHubContext<OrderStatusHub> hubContext)
    {
        _context = context;
        _logger = logger;
        _publishEndpoint = publishEndpoint;
        _hubContext = hubContext;
    }

    /// <summary>Admin: tum iade talepleri, istege bagli durum filtresi.</summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<ReturnRequestDto>>> GetAll([FromQuery] ReturnStatus? status)
    {
        var query = _context.ReturnRequests.Include(r => r.Items).AsQueryable();

        if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        var requests = await query
            .OrderByDescending(r => r.RequestedAt)
            .ToListAsync();

        return Ok(requests.Select(ReturnLabels.ToDto).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReturnRequestDto>> GetById(Guid id)
    {
        var request = await _context.ReturnRequests
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request is null) return NotFound();

        if (!CallerIdentity.CanAccessBuyer(User, request.BuyerId))
            return Forbid();

        return Ok(ReturnLabels.ToDto(request));
    }

    /// <summary>Musteri: kendi iade taleplerini listeler.</summary>
    [HttpGet("buyer/{buyerId}")]
    public async Task<ActionResult<List<ReturnRequestDto>>> GetByBuyer(string buyerId)
    {
        if (!CallerIdentity.CanAccessBuyer(User, buyerId))
            return Forbid();

        var requests = await _context.ReturnRequests
            .Include(r => r.Items)
            .Where(r => r.BuyerId == buyerId)
            .OrderByDescending(r => r.RequestedAt)
            .ToListAsync();

        return Ok(requests.Select(ReturnLabels.ToDto).ToList());
    }

    /// <summary>
    /// Musteri: siparis icin iade talebi acar.
    /// Items bos gonderilirse siparisin tamami iade edilmek istenmis sayilir.
    /// </summary>
    [HttpPost("~/api/orders/{orderId:guid}/returns")]
    public async Task<ActionResult<ReturnRequestDto>> Create(
        Guid orderId, [FromBody] CreateReturnRequest request)
    {
        var order = await _context.Orders
            .Include(nameof(Entities.Order.OrderItems))
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return NotFound("Sipariş bulunamadı.");

        if (!CallerIdentity.CanAccessBuyer(User, order.BuyerId))
            return Forbid();

        if (!ReturnableStatuses.Contains(order.OrderStatus))
            return BadRequest(
                $"'{order.OrderStatus}' durumundaki sipariş için iade talebi açılamaz.");

        var hasOpenRequest = await _context.ReturnRequests.AnyAsync(r =>
            r.OrderId == orderId &&
            (r.Status == ReturnStatus.Pending || r.Status == ReturnStatus.Approved));

        if (hasOpenRequest)
            return BadRequest("Bu sipariş için devam eden bir iade talebi zaten var.");

        var orderItems = order.OrderItems.ToList();

        // Kalem secilmemisse siparisin tamami iade edilir
        var selections = request.Items is { Count: > 0 }
            ? request.Items
            : orderItems.Select(i => new CreateReturnItemRequest(i.Id, i.Units)).ToList();

        var returnRequest = new ReturnRequest
        {
            OrderId = orderId,
            BuyerId = order.BuyerId,
            RequestNumber = GenerateRequestNumber(),
            RequestType = request.RequestType,
            Reason = request.Reason,
            ReasonDetail = request.ReasonDetail?.Trim(),
            Status = ReturnStatus.Pending
        };

        foreach (var selection in selections)
        {
            var orderItem = orderItems.FirstOrDefault(i => i.Id == selection.OrderItemId);
            if (orderItem is null)
                return BadRequest($"Sipariş kalemi bulunamadı: {selection.OrderItemId}");

            if (selection.Units < 1 || selection.Units > orderItem.Units)
                return BadRequest(
                    $"'{orderItem.ProductName}' için adet 1 ile {orderItem.Units} arasında olmalı.");

            if (request.RequestType == ReturnRequestType.Exchange &&
                !selection.ExchangeProductId.HasValue &&
                string.IsNullOrWhiteSpace(selection.ExchangeProductName))
            {
                return BadRequest("Değişim talebinde hedef ürün bilgisi zorunludur.");
            }

            returnRequest.Items.Add(new ReturnRequestItem
            {
                OrderItemId = orderItem.Id,
                ProductId = orderItem.ProductId,
                ProductName = orderItem.ProductName,
                UnitPrice = orderItem.UnitPrice,
                Units = selection.Units,
                ExchangeProductId = selection.ExchangeProductId,
                ExchangeProductName = selection.ExchangeProductName?.Trim(),
                ExchangeSelectedAttributes = selection.ExchangeSelectedAttributes?.Trim()
            });
        }

        // Degisimde iade tutari 0; iadede kalem tutari
        returnRequest.RefundAmount = request.RequestType == ReturnRequestType.Exchange
            ? 0
            : returnRequest.Items.Sum(i => i.UnitPrice * i.Units);

        _context.ReturnRequests.Add(returnRequest);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "İade talebi oluşturuldu. {RequestNumber} sipariş {OrderId} için, tutar {Amount}",
            returnRequest.RequestNumber, orderId, returnRequest.RefundAmount);

        return CreatedAtAction(nameof(GetById), new { id = returnRequest.Id },
            ReturnLabels.ToDto(returnRequest));
    }

    /// <summary>Admin: talebi onaylar. Iade tutari revize edilebilir.</summary>
    [HttpPut("{id:guid}/approve")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ReturnRequestDto>> Approve(
        Guid id, [FromBody] ResolveReturnRequest? request)
    {
        var returnRequest = await LoadPending(id);
        if (returnRequest is null) return NotFound("Bekleyen iade talebi bulunamadı.");

        returnRequest.Status = ReturnStatus.Approved;
        returnRequest.AdminNote = request?.AdminNote?.Trim();
        returnRequest.ResolvedAt = DateTime.UtcNow;
        returnRequest.UpdatedAt = DateTime.UtcNow;

        if (request?.RefundAmount is > 0)
            returnRequest.RefundAmount = request.RefundAmount.Value;

        await _context.SaveChangesAsync();
        return Ok(ReturnLabels.ToDto(returnRequest));
    }

    [HttpPut("{id:guid}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ReturnRequestDto>> Reject(
        Guid id, [FromBody] ResolveReturnRequest? request)
    {
        var returnRequest = await LoadPending(id);
        if (returnRequest is null) return NotFound("Bekleyen iade talebi bulunamadı.");

        returnRequest.Status = ReturnStatus.Rejected;
        returnRequest.AdminNote = request?.AdminNote?.Trim();
        returnRequest.ResolvedAt = DateTime.UtcNow;
        returnRequest.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ReturnLabels.ToDto(returnRequest));
    }

    /// <summary>Admin: onaylanmis talebin geri odemesini isaretler ve siparisi iade eder.</summary>
    [HttpPut("{id:guid}/refund")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ReturnRequestDto>> Refund(
        Guid id, [FromBody] ResolveReturnRequest? request)
    {
        var returnRequest = await _context.ReturnRequests
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (returnRequest is null) return NotFound();

        if (returnRequest.Status != ReturnStatus.Approved)
            return BadRequest("Yalnızca onaylanmış talepler için geri ödeme yapılabilir.");

        returnRequest.Status = ReturnStatus.Refunded;
        returnRequest.RefundedAt = DateTime.UtcNow;
        returnRequest.UpdatedAt = DateTime.UtcNow;

        if (request?.RefundAmount is > 0)
            returnRequest.RefundAmount = request.RefundAmount.Value;

        if (!string.IsNullOrWhiteSpace(request?.AdminNote))
            returnRequest.AdminNote = request.AdminNote.Trim();

        var order = await _context.Orders
            .Include(nameof(Entities.Order.OrderItems))
            .FirstOrDefaultAsync(o => o.Id == returnRequest.OrderId);

        order?.SetStatus("Returned");

        await _context.SaveChangesAsync();

        if (order is not null)
        {
            await OrderStatusRealtime.NotifyAsync(_hubContext, order, _logger);
            await _publishEndpoint.Publish(new OrderStockReleaseEvent
            {
                OrderId = order.Id,
                Reason = $"İade iadesi: {returnRequest.RequestNumber}",
                ReleaseType = "Refund",
                OrderItems = order.OrderItems.Select(i => new OrderItemMessage
                {
                    ProductId = i.ProductId.ToString(),
                    ProductName = i.ProductName,
                    PictureUrl = i.PictureUrl,
                    Price = i.UnitPrice,
                    Quantity = i.Units
                }).ToList()
            });
        }

        _logger.LogInformation(
            "İade tamamlandı. {RequestNumber}, tutar {Amount}",
            returnRequest.RequestNumber, returnRequest.RefundAmount);

        return Ok(ReturnLabels.ToDto(returnRequest));
    }

    /// <summary>Musteri: bekleyen kendi talebini geri ceker.</summary>
    [HttpPut("{id:guid}/cancel")]
    public async Task<ActionResult<ReturnRequestDto>> CancelRequest(Guid id)
    {
        var returnRequest = await LoadPending(id);
        if (returnRequest is null) return NotFound("Bekleyen iade talebi bulunamadı.");

        if (!CallerIdentity.CanAccessBuyer(User, returnRequest.BuyerId))
            return Forbid();

        returnRequest.Status = ReturnStatus.Cancelled;
        returnRequest.ResolvedAt = DateTime.UtcNow;
        returnRequest.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ReturnLabels.ToDto(returnRequest));
    }

    /// <summary>Kargoya verilmemis siparisi iptal eder.</summary>
    [HttpPost("~/api/orders/{orderId:guid}/cancel")]
    public async Task<IActionResult> CancelOrder(Guid orderId, [FromBody] CancelOrderRequest? request)
    {
        var order = await _context.Orders
            .Include(nameof(Entities.Order.OrderItems))
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return NotFound("Sipariş bulunamadı.");

        if (!CallerIdentity.CanAccessBuyer(User, order.BuyerId))
            return Forbid();

        if (!CancellableStatuses.Contains(order.OrderStatus))
            return BadRequest(
                $"'{order.OrderStatus}' durumundaki sipariş iptal edilemez. Kargolanan siparişler için iade talebi açın.");

        var previousStatus = order.OrderStatus;
        order.SetStatus("Cancelled");
        await _context.SaveChangesAsync();

        await OrderStatusRealtime.NotifyAsync(_hubContext, order, _logger);

        // Paid ise stok düşülmüş olabilir — Submitted'ta henüz düşülmemiş olabilir ama
        // ledger boşsa consumer no-op yapar.
        await _publishEndpoint.Publish(new OrderStockReleaseEvent
        {
            OrderId = order.Id,
            Reason = request?.Reason ?? $"İptal (önceki durum: {previousStatus})",
            ReleaseType = "Cancel",
            OrderItems = order.OrderItems.Select(i => new OrderItemMessage
            {
                ProductId = i.ProductId.ToString(),
                ProductName = i.ProductName,
                PictureUrl = i.PictureUrl,
                Price = i.UnitPrice,
                Quantity = i.Units
            }).ToList()
        });

        _logger.LogInformation(
            "Sipariş iptal edildi. {OrderId}, neden: {Reason}",
            orderId, request?.Reason ?? "belirtilmedi");

        return Ok(new { order.Id, order.OrderStatus });
    }

    private Task<ReturnRequest?> LoadPending(Guid id) =>
        _context.ReturnRequests
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id && r.Status == ReturnStatus.Pending);

    private static string GenerateRequestNumber() =>
        $"IAD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
}
