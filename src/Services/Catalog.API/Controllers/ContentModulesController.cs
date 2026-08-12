using System.Text;
using System.Text.RegularExpressions;
using Catalog.API.Data;
using Catalog.API.Entities;
using Core.Shared.Events;
using MassTransit;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

public record CreateContactMessageRequest(
    string Name,
    string Email,
    string? Phone,
    string Subject,
    string Message);

public record NewsletterEmailRequest(string Email);

public record CreateStockAlertRequest(
    Guid ProductId,
    string Email,
    string? UserId);

[Route("api/contact")]
[ApiController]
public class PublicContactController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public PublicContactController(CatalogDbContext context) => _context = context;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateContactMessageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) ||
            string.IsNullOrWhiteSpace(req.Email) ||
            string.IsNullOrWhiteSpace(req.Subject) ||
            string.IsNullOrWhiteSpace(req.Message))
        {
            return BadRequest("Ad, e-posta, konu ve mesaj zorunludur.");
        }

        if (!IsValidEmail(req.Email))
            return BadRequest("Geçerli bir e-posta girin.");

        var msg = new ContactMessage
        {
            Name = req.Name.Trim(),
            Email = req.Email.Trim().ToLowerInvariant(),
            Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
            Subject = req.Subject.Trim(),
            Message = req.Message.Trim(),
            IsRead = false
        };

        _context.ContactMessages.Add(msg);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Mesajınız alındı. En kısa sürede dönüş yapacağız." });
    }

    internal static bool IsValidEmail(string email) =>
        Regex.IsMatch(email.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
}

[Route("api/newsletter")]
[ApiController]
public class PublicNewsletterController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public PublicNewsletterController(CatalogDbContext context) => _context = context;

    /// <summary>
    /// MVP: double-opt-in e-postası yok; abone IsConfirmed=true kaydedilir.
    /// ConfirmToken yine üretilir (ileride e-posta doğrulama için).
    /// </summary>
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] NewsletterEmailRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !PublicContactController.IsValidEmail(req.Email))
            return BadRequest("Geçerli bir e-posta girin.");

        var email = req.Email.Trim().ToLowerInvariant();
        var existing = await _context.NewsletterSubscribers
            .FirstOrDefaultAsync(s => s.Email == email);

        if (existing is not null)
        {
            if (existing.UnsubscribedAt is not null)
            {
                existing.UnsubscribedAt = null;
                existing.IsConfirmed = true;
                existing.ConfirmedAt = DateTime.UtcNow;
                existing.ConfirmToken = Guid.NewGuid().ToString("N");
                existing.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Bültene tekrar abone oldunuz." });
            }

            return Ok(new { message = "Bu e-posta zaten abone." });
        }

        var now = DateTime.UtcNow;
        _context.NewsletterSubscribers.Add(new NewsletterSubscriber
        {
            Email = email,
            // MVP: e-posta doğrulaması yok
            IsConfirmed = true,
            ConfirmToken = Guid.NewGuid().ToString("N"),
            ConfirmedAt = now
        });
        await _context.SaveChangesAsync();

        return Ok(new { message = "Bültene abone oldunuz." });
    }

    [HttpGet("confirm")]
    public async Task<IActionResult> Confirm([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest("Token gerekli.");

        var sub = await _context.NewsletterSubscribers
            .FirstOrDefaultAsync(s => s.ConfirmToken == token);

        if (sub is null) return NotFound("Geçersiz veya kullanılmış token.");

        sub.IsConfirmed = true;
        sub.ConfirmedAt = DateTime.UtcNow;
        sub.UnsubscribedAt = null;
        sub.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Aboneliğiniz onaylandı." });
    }

    [HttpPost("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] NewsletterEmailRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !PublicContactController.IsValidEmail(req.Email))
            return BadRequest("Geçerli bir e-posta girin.");

        var email = req.Email.Trim().ToLowerInvariant();
        var sub = await _context.NewsletterSubscribers
            .FirstOrDefaultAsync(s => s.Email == email);

        if (sub is null)
            return Ok(new { message = "Abonelik bulunamadı." });

        sub.UnsubscribedAt = DateTime.UtcNow;
        sub.IsConfirmed = false;
        sub.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Abonelikten çıktınız." });
    }
}

[Route("api/stock-alerts")]
[ApiController]
public class PublicStockAlertsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public PublicStockAlertsController(CatalogDbContext context) => _context = context;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStockAlertRequest req)
    {
        if (req.ProductId == Guid.Empty)
            return BadRequest("Ürün gerekli.");

        if (string.IsNullOrWhiteSpace(req.Email) || !PublicContactController.IsValidEmail(req.Email))
            return BadRequest("Geçerli bir e-posta girin.");

        var email = req.Email.Trim().ToLowerInvariant();

        var productExists = await _context.Products.AnyAsync(p => p.Id == req.ProductId);
        if (!productExists) return NotFound("Ürün bulunamadı.");

        var pending = await _context.StockNotificationRequests.AnyAsync(r =>
            r.ProductId == req.ProductId &&
            r.Email == email &&
            !r.IsNotified);

        if (pending)
            return Ok(new { message = "Bu ürün için zaten stok bildirimi kaydınız var." });

        _context.StockNotificationRequests.Add(new StockNotificationRequest
        {
            ProductId = req.ProductId,
            Email = email,
            UserId = string.IsNullOrWhiteSpace(req.UserId) ? null : req.UserId.Trim(),
            IsNotified = false
        });
        await _context.SaveChangesAsync();

        return Ok(new { message = "Stok geldiğinde sizi bilgilendireceğiz." });
    }
}

[Route("api/faqs")]
[ApiController]
public class PublicFaqsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public PublicFaqsController(CatalogDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetPublished()
    {
        var items = await _context.FaqItems
            .AsNoTracking()
            .Where(f => f.IsPublished)
            .OrderBy(f => f.SortOrder)
            .ThenBy(f => f.Question)
            .Select(f => new
            {
                f.Id,
                f.Category,
                f.Question,
                f.Answer,
                f.SortOrder
            })
            .ToListAsync();

        return Ok(items);
    }
}

// ---- Admin ----

public record SaveFaqRequest(
    string Category,
    string Question,
    string Answer,
    int SortOrder = 0,
    bool IsPublished = true);

public record MarkContactReadRequest(bool IsRead = true);

[Route("api/admin/contact")]
[ApiController]
public class AdminContactController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminContactController(CatalogDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool? unreadOnly = null)
    {
        var query = _context.ContactMessages.AsNoTracking().AsQueryable();
        if (unreadOnly == true) query = query.Where(m => !m.IsRead);

        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new
            {
                m.Id,
                m.Name,
                m.Email,
                m.Phone,
                m.Subject,
                m.Message,
                m.IsRead,
                m.CreatedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, [FromBody] MarkContactReadRequest? req)
    {
        var msg = await _context.ContactMessages.FindAsync(id);
        if (msg is null) return NotFound();

        msg.IsRead = req?.IsRead ?? true;
        msg.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(msg);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var msg = await _context.ContactMessages.FindAsync(id);
        if (msg is null) return NotFound();

        _context.ContactMessages.Remove(msg);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

[Route("api/admin/newsletter")]
[ApiController]
public class AdminNewsletterController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminNewsletterController(CatalogDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool? activeOnly = null)
    {
        var query = _context.NewsletterSubscribers.AsNoTracking().AsQueryable();
        if (activeOnly == true)
            query = query.Where(s => s.IsConfirmed && s.UnsubscribedAt == null);

        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.Email,
                s.IsConfirmed,
                s.ConfirmedAt,
                s.CreatedAt,
                s.UnsubscribedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportCsv()
    {
        var items = await _context.NewsletterSubscribers
            .AsNoTracking()
            .OrderBy(s => s.Email)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Email,IsConfirmed,ConfirmedAt,CreatedAt,UnsubscribedAt");
        foreach (var s in items)
        {
            sb.AppendLine(string.Join(",",
                EscapeCsv(s.Email),
                s.IsConfirmed ? "true" : "false",
                s.ConfirmedAt?.ToString("o") ?? "",
                s.CreatedAt.ToString("o"),
                s.UnsubscribedAt?.ToString("o") ?? ""));
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv", $"newsletter-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var sub = await _context.NewsletterSubscribers.FindAsync(id);
        if (sub is null) return NotFound();

        _context.NewsletterSubscribers.Remove(sub);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains('"') || value.Contains(',') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}

[Route("api/admin/faqs")]
[ApiController]
public class AdminFaqsController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public AdminFaqsController(CatalogDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var items = await _context.FaqItems
            .AsNoTracking()
            .OrderBy(f => f.SortOrder)
            .ThenBy(f => f.Question)
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var item = await _context.FaqItems.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveFaqRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Question) || string.IsNullOrWhiteSpace(req.Answer))
            return BadRequest("Soru ve cevap zorunludur.");

        var item = new FaqItem
        {
            Category = string.IsNullOrWhiteSpace(req.Category) ? "Genel" : req.Category.Trim(),
            Question = req.Question.Trim(),
            Answer = req.Answer.Trim(),
            SortOrder = req.SortOrder,
            IsPublished = req.IsPublished
        };
        _context.FaqItems.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveFaqRequest req)
    {
        var item = await _context.FaqItems.FindAsync(id);
        if (item is null) return NotFound();

        if (string.IsNullOrWhiteSpace(req.Question) || string.IsNullOrWhiteSpace(req.Answer))
            return BadRequest("Soru ve cevap zorunludur.");

        item.Category = string.IsNullOrWhiteSpace(req.Category) ? "Genel" : req.Category.Trim();
        item.Question = req.Question.Trim();
        item.Answer = req.Answer.Trim();
        item.SortOrder = req.SortOrder;
        item.IsPublished = req.IsPublished;
        item.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var item = await _context.FaqItems.FindAsync(id);
        if (item is null) return NotFound();

        _context.FaqItems.Remove(item);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

[Route("api/admin/stock-alerts")]
[ApiController]
public class AdminStockAlertsController : ControllerBase
{
    private readonly CatalogDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<AdminStockAlertsController> _logger;

    public AdminStockAlertsController(
        CatalogDbContext context,
        IPublishEndpoint publishEndpoint,
        ILogger<AdminStockAlertsController> logger)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> ListPending([FromQuery] bool pendingOnly = true)
    {
        var query =
            from r in _context.StockNotificationRequests.AsNoTracking()
            join p in _context.Products.AsNoTracking() on r.ProductId equals p.Id into pj
            from p in pj.DefaultIfEmpty()
            select new { r, productName = p != null ? p.Name : null };

        if (pendingOnly) query = query.Where(x => !x.r.IsNotified);

        var items = await query
            .OrderByDescending(x => x.r.CreatedAt)
            .Select(x => new
            {
                x.r.Id,
                x.r.ProductId,
                x.productName,
                x.r.Email,
                x.r.UserId,
                x.r.IsNotified,
                x.r.CreatedAt,
                x.r.NotifiedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    /// <summary>
    /// Stok bildirimi gönder: mümkünse Notification'a AccountEmailEvent yayınlar; aksi halde log stub.
    /// </summary>
    [HttpPost("{id:guid}/notify")]
    public async Task<IActionResult> Notify(Guid id)
    {
        var alert = await _context.StockNotificationRequests.FirstOrDefaultAsync(r => r.Id == id);
        if (alert is null) return NotFound();
        if (alert.IsNotified)
            return BadRequest("Bu talep zaten bildirilmiş.");

        var product = await _context.Products.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == alert.ProductId);
        var productName = product?.Name ?? alert.ProductId.ToString();

        var subject = $"Stok bildirimi: {productName}";
        var html =
            $"<p>Merhaba,</p><p><strong>{System.Net.WebUtility.HtmlEncode(productName)}</strong> ürünü tekrar stokta.</p>" +
            "<p>İyi alışverişler.</p>";

        try
        {
            await _publishEndpoint.Publish(new AccountEmailEvent
            {
                Email = alert.Email,
                Subject = subject,
                HtmlBody = html
            });
            _logger.LogInformation(
                "Stock alert notified via AccountEmailEvent: {AlertId} -> {Email}", alert.Id, alert.Email);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Stock alert notify stub (publish failed): {AlertId} -> {Email} / {Product}",
                alert.Id, alert.Email, productName);
        }

        alert.IsNotified = true;
        alert.NotifiedAt = DateTime.UtcNow;
        alert.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            alert.Id,
            alert.Email,
            alert.ProductId,
            productName,
            alert.IsNotified,
            alert.NotifiedAt
        });
    }
}
