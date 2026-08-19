using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using Core.Shared.Events;
using Order.API.Data;
using Order.API.Domain.AggregatesModel.OrderAggregate;
using Order.API.Hubs;
using Order.API.Security;
using Order.API.Services;
using System.Globalization;
using System.Text;
using OrderEntity = Order.API.Entities.Order;

namespace Order.API.Controllers;

[Route("api/orders")]
[ApiController]
[Authorize]
public class OrderController : ControllerBase
{
    private readonly OrderDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IHubContext<OrderStatusHub> _hubContext;

    public OrderController(
        OrderDbContext context,
        IPublishEndpoint publishEndpoint,
        IHubContext<OrderStatusHub> hubContext)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
        _hubContext = hubContext;
    }

    /// <summary>
    /// Misafir / herkese açık sipariş takibi (e-posta + sipariş no).
    /// </summary>
    [HttpPost("track")]
    [AllowAnonymous]
    [EnableRateLimiting("order-track")]
    public async Task<ActionResult<OrderTrackDto>> TrackOrder([FromBody] TrackOrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.OrderNumber))
            return BadRequest("email ve orderNumber zorunludur.");

        var orderNumber = request.OrderNumber.Trim();
        var email = request.Email.Trim();

        var order = await _context.Orders
            .Include(nameof(OrderEntity.OrderItems))
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber);

        if (order is null)
            return NotFound("Sipariş bulunamadı.");

        if (!string.Equals(order.EmailAddress, email, StringComparison.OrdinalIgnoreCase))
            return NotFound("Sipariş bulunamadı.");

        return Ok(new OrderTrackDto
        {
            OrderNumber = order.OrderNumber!,
            OrderDate = order.OrderDate,
            OrderStatus = order.OrderStatus,
            TotalAmount = order.TotalAmount,
            TrackingNumber = order.TrackingNumber,
            FirstName = order.FirstName,
            LastName = order.LastName,
            AddressLine = order.Address?.Street,
            City = order.Address?.City,
            State = order.Address?.State,
            Country = order.Address?.Country,
            ZipCode = order.Address?.ZipCode,
            PaymentMethod = order.PaymentMethod,
            Items = order.OrderItems.Select(i => new OrderTrackItemDto
            {
                ProductName = i.ProductName,
                PictureUrl = i.PictureUrl,
                UnitPrice = i.UnitPrice,
                Units = i.Units
            }).ToList()
        });
    }

    /// <summary>
    /// Admin: sipariş listesi. page verilirse sayfalanmış sonuç; aksi halde tam liste (dashboard).
    /// </summary>
    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllOrders(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null)
    {
        var query = BuildAdminOrderQuery(from, to, status, search);

        if (page is null)
        {
            var orders = await query
                .Include(nameof(OrderEntity.OrderItems))
                .ToListAsync();
            return Ok(orders.Select(MapToDto).ToList());
        }

        var size = Math.Clamp(pageSize ?? 20, 1, 200);
        var pageNumber = Math.Max(page.Value, 1);
        var totalCount = await query.CountAsync();

        var items = await query
            .Include(nameof(OrderEntity.OrderItems))
            .Skip((pageNumber - 1) * size)
            .Take(size)
            .ToListAsync();

        return Ok(new PagedOrdersDto
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = totalCount,
            Page = pageNumber,
            PageSize = size
        });
    }

    /// <summary>Admin: sipariş listesini CSV olarak dışa aktarır.</summary>
    [HttpGet("export")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ExportOrdersCsv(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        var orders = await BuildAdminOrderQuery(from, to, status, search)
            .Include(nameof(OrderEntity.OrderItems))
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("OrderId,OrderNumber,BuyerId,Customer,Email,Status,TotalAmount,OrderDate,ItemCount,PaymentMethod");

        foreach (var o in orders)
        {
            var customer = $"{o.FirstName} {o.LastName}".Trim();
            sb.AppendLine(string.Join(",",
                Csv(o.Id.ToString()),
                Csv(o.OrderNumber),
                Csv(o.BuyerId),
                Csv(customer),
                Csv(o.EmailAddress),
                Csv(o.OrderStatus),
                o.TotalAmount.ToString(CultureInfo.InvariantCulture),
                o.OrderDate.ToString("o", CultureInfo.InvariantCulture),
                o.OrderItems.Count.ToString(CultureInfo.InvariantCulture),
                Csv(o.PaymentMethod)));
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv", $"orders-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    /// <summary>Admin: manuel sipariş oluşturur.</summary>
    [HttpPost("manual")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<OrderDto>> CreateManualOrder([FromBody] CreateManualOrderRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return BadRequest("En az bir sipariş kalemi gerekli.");

        if (string.IsNullOrWhiteSpace(request.EmailAddress) ||
            string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName))
            return BadRequest("Müşteri adı, soyadı ve e-posta zorunludur.");

        if (string.IsNullOrWhiteSpace(request.AddressLine) || string.IsNullOrWhiteSpace(request.City))
            return BadRequest("Adres ve şehir zorunludur.");

        foreach (var item in request.Items)
        {
            if (item.ProductId == Guid.Empty || item.Units < 1 || item.UnitPrice < 0)
                return BadRequest("Geçersiz ürün kalemi.");
            if (string.IsNullOrWhiteSpace(item.ProductName))
                return BadRequest("Ürün adı zorunludur.");
        }

        var buyerId = string.IsNullOrWhiteSpace(request.BuyerId)
            ? $"manual:{request.EmailAddress.Trim().ToLowerInvariant()}"
            : request.BuyerId.Trim();

        var address = new Address(
            street: request.AddressLine.Trim(),
            city: request.City.Trim(),
            state: request.State?.Trim() ?? string.Empty,
            country: request.Country?.Trim() ?? "TR",
            zipCode: request.ZipCode?.Trim() ?? string.Empty);

        var order = new OrderEntity(buyerId, address, request.Description?.Trim());
        order.SetContact(request.FirstName.Trim(), request.LastName.Trim(), request.EmailAddress.Trim());
        order.SetPaymentMethod(request.PaymentMethod);
        order.SetAdminNote(request.AdminNote);
        order.SetInvoice(request.InvoiceType, request.TaxId, request.TaxOffice, request.CompanyName);
        order.SetOrderNumber(await GenerateUniqueOrderNumberAsync());
        order.AddStatusHistory("Submitted", "Manuel sipariş oluşturuldu");

        foreach (var item in request.Items)
        {
            order.AddOrderItem(
                item.ProductId,
                item.ProductName.Trim(),
                item.UnitPrice,
                item.PictureUrl,
                item.Units,
                item.SelectedAttributes);
        }

        var itemsTotal = order.OrderItems.Sum(i => i.UnitPrice * i.Units);
        var shipping = request.ShippingCost ?? 0;
        var discount = request.DiscountAmount ?? 0;
        var total = request.TotalPrice ?? Math.Max(0, itemsTotal + shipping - discount);

        order.SetTotals(total, discount, request.CouponCode, shipping);

        if (!string.IsNullOrWhiteSpace(request.InitialStatus))
        {
            var valid = new[] { "Submitted", "Paid", "Shipped", "Delivered" };
            if (!valid.Contains(request.InitialStatus))
                return BadRequest("Geçersiz başlangıç durumu.");
            order.SetStatus(request.InitialStatus);
            if (request.InitialStatus != "Submitted")
                order.AddStatusHistory(request.InitialStatus, "Manuel sipariş başlangıç durumu");
        }

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOrderDetail), new { orderId = order.Id }, MapToDto(order));
    }

    /// <summary>Admin: sipariş iç notunu günceller.</summary>
    [HttpPut("{orderId:guid}/note")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateAdminNote(Guid orderId, [FromBody] UpdateAdminNoteRequest request)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order is null) return NotFound("Sipariş bulunamadı.");

        order.SetAdminNote(request.AdminNote);
        await _context.SaveChangesAsync();

        return Ok(new { order.Id, order.AdminNote });
    }

    /// <summary>Fatura PDF (sipariş sahibi veya Admin).</summary>
    [HttpGet("{orderId:guid}/invoice.pdf")]
    public async Task<IActionResult> GetInvoicePdf(Guid orderId)
    {
        var order = await _context.Orders
            .Include(nameof(OrderEntity.OrderItems))
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return NotFound("Sipariş bulunamadı.");

        if (!CallerIdentity.CanAccessBuyer(User, order.BuyerId))
            return Forbid();

        var pdf = InvoicePdfService.Generate(order);
        var fileName = $"invoice-{(order.OrderNumber ?? order.Id.ToString("N")[..8])}.pdf";
        return File(pdf, "application/pdf", fileName);
    }

    // Kullanıcının kendi siparişleri (Admin herkese bakabilir)
    [HttpGet("{buyerId}")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrdersByBuyerId(string buyerId)
    {
        if (!CallerIdentity.CanAccessBuyer(User, buyerId))
            return Forbid();

        var orders = await _context.Orders
            .Include(nameof(OrderEntity.OrderItems))
            .Where(o => o.BuyerId == buyerId)
            .OrderByDescending(o => o.OrderDate)
            .ToListAsync();

        var result = orders.Select(MapToDto).ToList();
        return Ok(result);
    }

    /// <summary>Kullanıcının bu ürünü (iptal edilmemiş) siparişte alıp almadığı.</summary>
    [HttpGet("{buyerId}/purchased/{productId:guid}")]
    public async Task<IActionResult> HasPurchased(string buyerId, Guid productId)
    {
        if (!CallerIdentity.CanAccessBuyer(User, buyerId))
            return Forbid();

        var purchased = await _context.OrderItems
            .AsNoTracking()
            .AnyAsync(i =>
                i.ProductId == productId &&
                i.Order != null &&
                i.Order.BuyerId == buyerId &&
                i.Order.OrderStatus != "Cancelled");

        return Ok(new { purchased });
    }

    // Admin: Sipariş durumunu güncelle
    [HttpPut("{orderId:guid}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateOrderStatus(Guid orderId, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = await _context.Orders.FindAsync(orderId);
        if (order is null) return NotFound("Sipariş bulunamadı.");

        var validStatuses = new[] { "Submitted", "Paid", "Shipped", "Delivered", "Cancelled", "Returned" };
        if (!validStatuses.Contains(request.Status))
            return BadRequest($"Geçersiz durum. Geçerli durumlar: {string.Join(", ", validStatuses)}");

        if (!string.IsNullOrWhiteSpace(request.TrackingNumber))
            order.SetTrackingNumber(request.TrackingNumber);

        order.SetStatus(request.Status);
        _context.OrderStatusHistories.Add(new Order.API.Entities.OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Status = request.Status,
            Note = request.Note,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        await OrderStatusRealtime.NotifyAsync(_hubContext, order);

        if (request.Status == "Shipped" && !string.IsNullOrWhiteSpace(order.EmailAddress))
        {
            await _publishEndpoint.Publish(new OrderShippedEvent
            {
                OrderId = order.Id,
                OrderNumber = order.OrderNumber,
                Email = order.EmailAddress,
                TrackingNumber = order.TrackingNumber
            });
        }

        return Ok(new { order.Id, order.OrderNumber, order.OrderStatus, order.TrackingNumber });
    }

    // Tek sipariş detayı — sahibi veya Admin
    [HttpGet("detail/{orderId:guid}")]
    public async Task<ActionResult<OrderDto>> GetOrderDetail(Guid orderId)
    {
        var order = await _context.Orders
            .Include(nameof(OrderEntity.OrderItems))
            .Include(nameof(OrderEntity.StatusHistory))
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return NotFound();

        if (!CallerIdentity.CanAccessBuyer(User, order.BuyerId))
            return Forbid();

        return Ok(MapToDto(order));
    }

    private IQueryable<OrderEntity> BuildAdminOrderQuery(
        DateTime? from,
        DateTime? to,
        string? status,
        string? search)
    {
        var query = _context.Orders.AsQueryable();

        if (from.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(from.Value, DateTimeKind.Utc);
            query = query.Where(o => o.OrderDate >= fromUtc);
        }

        if (to.HasValue)
        {
            var toUtc = DateTime.SpecifyKind(to.Value, DateTimeKind.Utc);
            // gün sonu dahil
            if (to.Value.TimeOfDay == TimeSpan.Zero)
                toUtc = toUtc.AddDays(1);
            query = query.Where(o => o.OrderDate < toUtc);
        }

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(o => o.OrderStatus == status.Trim());

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(o =>
                (o.OrderNumber != null && o.OrderNumber.ToLower().Contains(term)) ||
                o.BuyerId.ToLower().Contains(term) ||
                o.EmailAddress.ToLower().Contains(term) ||
                o.FirstName.ToLower().Contains(term) ||
                o.LastName.ToLower().Contains(term) ||
                o.Id.ToString().ToLower().Contains(term));
        }

        return query.OrderByDescending(o => o.OrderDate);
    }

    private async Task<string> GenerateUniqueOrderNumberAsync()
    {
        var prefix = $"YS-{DateTime.UtcNow:yyMMdd}-";
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var candidate = prefix + Random.Shared.Next(0, 10000).ToString("D4");
            var exists = await _context.Orders.AnyAsync(o => o.OrderNumber == candidate);
            if (!exists) return candidate;
        }

        return prefix + Random.Shared.Next(1000, 9999) + Random.Shared.Next(10, 99);
    }

    private static string Csv(string? value)
    {
        var v = value ?? string.Empty;
        if (v.Contains('"') || v.Contains(',') || v.Contains('\n'))
            return $"\"{v.Replace("\"", "\"\"")}\"";
        return v;
    }

    private static OrderDto MapToDto(OrderEntity o) => new()
    {
        Id = o.Id,
        OrderNumber = o.OrderNumber,
        TrackingNumber = o.TrackingNumber,
        BuyerId = o.BuyerId,
        OrderDate = o.OrderDate,
        OrderStatus = o.OrderStatus,
        TotalAmount = o.TotalAmount,
        TotalPrice = o.TotalAmount,
        DiscountAmount = o.DiscountAmount,
        CouponCode = o.CouponCode,
        ShippingCost = o.ShippingCost,
        Description = o.Description,
        AdminNote = o.AdminNote,
        FirstName = o.FirstName,
        LastName = o.LastName,
        EmailAddress = o.EmailAddress,
        AddressLine = o.Address?.Street,
        City = o.Address?.City,
        State = o.Address?.State,
        Country = o.Address?.Country,
        ZipCode = o.Address?.ZipCode,
        InvoiceType = o.InvoiceType,
        TaxId = o.TaxId,
        TaxOffice = o.TaxOffice,
        CompanyName = o.CompanyName,
        BillingSameAsShipping = o.BillingSameAsShipping,
        BillingAddressLine = o.BillingAddressLine,
        BillingCity = o.BillingCity,
        BillingState = o.BillingState,
        BillingCountry = o.BillingCountry,
        BillingZipCode = o.BillingZipCode,
        PaymentMethod = o.PaymentMethod,
        GiftWrap = o.GiftWrap,
        GiftMessage = o.GiftMessage,
        StatusHistory = o.StatusHistory
            .OrderBy(h => h.CreatedAt)
            .Select(h => new OrderStatusHistoryDto
            {
                Status = h.Status,
                Note = h.Note,
                CreatedAt = h.CreatedAt
            })
            .ToList(),
        OrderItems = o.OrderItems.Select(i => new OrderItemDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            ProductName = i.ProductName,
            PictureUrl = i.PictureUrl,
            UnitPrice = i.UnitPrice,
            Price = i.UnitPrice,
            Units = i.Units,
            SelectedAttributes = i.SelectedAttributes
        }).ToList()
    };
}

public class OrderItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public string? PictureUrl { get; set; }
    public decimal UnitPrice { get; set; }

    /// <summary>UnitPrice ile ayni deger; magaza istemcisi bu adi bekliyor.</summary>
    public decimal Price { get; set; }

    public int Units { get; set; }
    public string? SelectedAttributes { get; set; }
}

public class OrderDto
{
    public Guid Id { get; set; }
    public string? OrderNumber { get; set; }
    public string? TrackingNumber { get; set; }
    public string BuyerId { get; set; } = default!;
    public DateTime OrderDate { get; set; }
    public string OrderStatus { get; set; } = default!;
    public decimal TotalAmount { get; set; }

    /// <summary>TotalAmount ile ayni deger; magaza istemcisi bu adi bekliyor.</summary>
    public decimal TotalPrice { get; set; }

    public decimal DiscountAmount { get; set; }
    public string? CouponCode { get; set; }
    public decimal ShippingCost { get; set; }

    public string? Description { get; set; }
    public string? AdminNote { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? EmailAddress { get; set; }
    public string? AddressLine { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? ZipCode { get; set; }

    public string? InvoiceType { get; set; }
    public string? TaxId { get; set; }
    public string? TaxOffice { get; set; }
    public string? CompanyName { get; set; }
    public bool BillingSameAsShipping { get; set; }
    public string? BillingAddressLine { get; set; }
    public string? BillingCity { get; set; }
    public string? BillingState { get; set; }
    public string? BillingCountry { get; set; }
    public string? BillingZipCode { get; set; }
    public string? PaymentMethod { get; set; }
    public bool GiftWrap { get; set; }
    public string? GiftMessage { get; set; }

    public List<OrderStatusHistoryDto> StatusHistory { get; set; } = new();

    public List<OrderItemDto> OrderItems { get; set; } = new();
}

public class OrderStatusHistoryDto
{
    public string Status { get; set; } = default!;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TrackOrderRequest
{
    public string Email { get; set; } = default!;
    public string OrderNumber { get; set; } = default!;
}

public class OrderTrackDto
{
    public string OrderNumber { get; set; } = default!;
    public DateTime OrderDate { get; set; }
    public string OrderStatus { get; set; } = default!;
    public decimal TotalAmount { get; set; }
    public string? TrackingNumber { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? AddressLine { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? ZipCode { get; set; }
    public string? PaymentMethod { get; set; }
    public List<OrderTrackItemDto> Items { get; set; } = new();
}

public class OrderTrackItemDto
{
    public string ProductName { get; set; } = default!;
    public string? PictureUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Units { get; set; }
}

public class PagedOrdersDto
{
    public List<OrderDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public record UpdateOrderStatusRequest(string Status, string? TrackingNumber = null, string? Note = null);

public record UpdateAdminNoteRequest(string? AdminNote);

public record CreateManualOrderItemRequest(
    Guid ProductId,
    string ProductName,
    decimal UnitPrice,
    int Units,
    string? PictureUrl = null,
    string? SelectedAttributes = null);

public record CreateManualOrderRequest(
    string? BuyerId,
    string FirstName,
    string LastName,
    string EmailAddress,
    string AddressLine,
    string City,
    string? State,
    string? Country,
    string? ZipCode,
    string? PaymentMethod,
    string? Description,
    string? AdminNote,
    string? InvoiceType,
    string? TaxId,
    string? TaxOffice,
    string? CompanyName,
    string? CouponCode,
    decimal? DiscountAmount,
    decimal? ShippingCost,
    decimal? TotalPrice,
    string? InitialStatus,
    List<CreateManualOrderItemRequest> Items);
