using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Order.API.Data;
using Order.API.Entities;
using OrderEntity = Order.API.Entities.Order;

namespace Order.API.Services.IntegraOps;

/// <summary>
/// Siparis adimlarini IntegraOps outbox'ina yazar. Kaydi cagiranin SaveChanges'i kalici yapar;
/// boylece olay, siparis degisikligiyle ayni transaction'da saklanir.
/// </summary>
public class IntegraOpsNotifier
{
    public const string OrderCreated = "order-created";
    public const string PaymentCompleted = "payment-completed";
    public const string StockReserved = "stock-reserved";
    public const string GiftWrap = "gift-wrap";
    public const string InvoiceCreated = "invoice-created";
    public const string CustomsDeclared = "customs-declared";
    public const string Shipped = "shipped";
    public const string Delivered = "delivered";

    public const string Completed = "completed";
    public const string Failed = "failed";
    public const string Skipped = "skipped";
    public const string Cancelled = "cancelled";

    private static readonly string[] DomesticCountries = { "TR", "TUR", "Türkiye", "Turkiye", "Turkey" };

    private readonly OrderDbContext _db;
    private readonly IntegraOpsOptions _options;
    private readonly ILogger<IntegraOpsNotifier> _logger;

    public IntegraOpsNotifier(
        OrderDbContext db,
        IOptions<IntegraOpsOptions> options,
        ILogger<IntegraOpsNotifier> logger)
    {
        _db = db;
        _options = options.Value;
        _logger = logger;
    }

    /// <summary>Odeme alindiginda: odeme, (varsa) hediye paketi ve fatura adimlari.</summary>
    public async Task TrackPaidAsync(OrderEntity order, CancellationToken ct = default)
    {
        await TrackAsync(order, PaymentCompleted, ct: ct);
        if (order.GiftWrap)
            await TrackAsync(order, GiftWrap, ct: ct);
        // Fatura odeme onayiyla birlikte duzenlenir (PDF ayni andan itibaren indirilebilir)
        await TrackAsync(order, InvoiceCreated, ct: ct);
    }

    /// <summary>Kargoya verildiginde: ihracat siparisinde once gumruk beyani.</summary>
    public async Task TrackShippedAsync(OrderEntity order, CancellationToken ct = default)
    {
        if (ResolveGroup(order, SimulationFor(order)) == "export")
            await TrackAsync(order, CustomsDeclared, ct: ct);
        await TrackAsync(order, Shipped, ct: ct);
    }

    /// <summary>Admin panelinden yapilan durum degisikligini ilgili adimlara cevirir.</summary>
    public async Task TrackStatusChangeAsync(
        OrderEntity order, string previousStatus, string newStatus, CancellationToken ct = default)
    {
        switch (newStatus)
        {
            case "Paid":
                await TrackPaidAsync(order, ct);
                break;
            case "Shipped":
                await TrackShippedAsync(order, ct);
                break;
            case "Delivered":
                // Admin kargolamayi atlayip dogrudan teslim ettiyse eksik adimlar teslimle ayni anda
                // bildirilir; zaten bildirilmis olanlar eventId sayesinde tekrar yazilmaz.
                await TrackShippedAsync(order, ct);
                await TrackAsync(order, Delivered, ct: ct);
                break;
            case "Cancelled":
                await TrackCancelledAsync(order, previousStatus, ct);
                break;
        }
    }

    /// <summary>Iptal, siparisin o an bekledigi adim uzerinden bildirilir.</summary>
    public Task TrackCancelledAsync(OrderEntity order, string previousStatus, CancellationToken ct = default)
    {
        var pendingStep = previousStatus switch
        {
            "Submitted" => PaymentCompleted,
            "Paid" => Shipped,
            _ => Delivered
        };
        return TrackAsync(order, pendingStep, Cancelled, ct: ct);
    }

    public async Task TrackAsync(
        OrderEntity order,
        string step,
        string status = Completed,
        string? error = null,
        CancellationToken ct = default)
    {
        if (!_options.IsConfigured) return;

        var transactionId = string.IsNullOrWhiteSpace(order.OrderNumber)
            ? order.Id.ToString("N")
            : order.OrderNumber;

        // Yalnizca entegrasyon acildiktan sonra olusan siparisler bildirilir:
        // baslangic adimi kuyrukta yoksa sonraki adimlar da gonderilmez.
        if (step != OrderCreated && !await ExistsAsync(m => m.TransactionId == transactionId && m.Step == OrderCreated, ct))
            return;

        var simulation = SimulationFor(order);
        if (status == Completed && simulation.IsFailed(step))
        {
            status = Failed;
            error = $"Simülasyon: {step} adımı hata ile bildirildi";
        }

        var eventId = CreateEventId(transactionId, step, status);
        if (await ExistsAsync(m => m.Id == eventId, ct))
            return;

        // Bir siparisin adimlari IntegraOps'a gerceklesme sirasiyla gitsin: gecikmeli bir
        // adimin arkasindan gelenler ondan once gerceklesmis gorunmez.
        var now = DateTime.UtcNow;
        var latest = await LatestOccurredAtAsync(transactionId, ct);
        var occurredAt = (latest > now ? latest.Value : now) + simulation.DelayFor(step);
        var dropped = simulation.IsDropped(step);

        // Cozulmemis bir hata varken diger adimlarin tamamlanmasi bekletilir: gercek bir hatada
        // oldugu gibi akis durur (#sim:fail ile isaretlenen adim da akisi burada keser).
        // Iptal ve ayni adimin yeniden denemede basarili olmasi her zaman bildirilir; ikisi de
        // IntegraOps'taki "basarisiz" alarmini kapatir. Hata cozulunce bekleyenler gonderilir.
        var unresolved = await UnresolvedFailedStepsAsync(transactionId, ct);
        var held = status == Completed && unresolved.Any(s => s != step);

        _db.IntegraOpsOutbox.Add(new IntegraOpsOutboxMessage
        {
            Id = eventId,
            OrderId = order.Id,
            TransactionId = transactionId,
            Step = step,
            Status = status,
            Error = status == Failed ? Truncate(error ?? "Bilinmeyen hata", 500) : null,
            Group = ResolveGroup(order, simulation),
            OccurredAt = occurredAt,
            NextAttemptAt = occurredAt,
            State = dropped ? IntegraOpsOutboxState.Dropped
                : held ? IntegraOpsOutboxState.Held
                : IntegraOpsOutboxState.Pending,
            CreatedAt = now
        });

        if (status == Completed && unresolved.Count > 0 && unresolved.All(s => s == step))
            await ReleaseHeldAsync(transactionId, ct);

        if (dropped)
            _logger.LogWarning("IntegraOps simülasyonu: {Step} adımı bildirilmeyecek. Sipariş={TransactionId}", step, transactionId);
    }

    private IntegraOpsSimulation SimulationFor(OrderEntity order) =>
        _options.SimulationEnabled ? IntegraOpsSimulation.Parse(order.Description) : IntegraOpsSimulation.None;

    private string? ResolveGroup(OrderEntity order, IntegraOpsSimulation simulation)
    {
        if (simulation.Group is "vip" or "export") return simulation.Group;

        var country = order.Address?.Country?.Trim();
        if (!string.IsNullOrEmpty(country) &&
            !DomesticCountries.Contains(country, StringComparer.OrdinalIgnoreCase))
            return "export";

        if (_options.VipMinTotal > 0 && order.TotalAmount >= _options.VipMinTotal)
            return "vip";

        return null;
    }

    private async Task<bool> ExistsAsync(
        Expression<Func<IntegraOpsOutboxMessage, bool>> predicate, CancellationToken ct)
    {
        // Ayni SaveChanges icinde eklenmis, henuz kaydedilmemis satirlar da sayilir
        if (_db.IntegraOpsOutbox.Local.Any(predicate.Compile())) return true;
        return await _db.IntegraOpsOutbox.AsNoTracking().AnyAsync(predicate, ct);
    }

    /// <summary>Failed bildirilmis ve ardindan ayni adimi completed olmamis adimlar.</summary>
    private async Task<List<string>> UnresolvedFailedStepsAsync(string transactionId, CancellationToken ct)
    {
        var saved = await _db.IntegraOpsOutbox.AsNoTracking()
            .Where(m => m.TransactionId == transactionId && (m.Status == Failed || m.Status == Completed))
            .Select(m => new { m.Step, m.Status })
            .ToListAsync(ct);
        var rows = saved
            .Concat(_db.IntegraOpsOutbox.Local
                .Where(m => m.TransactionId == transactionId && (m.Status == Failed || m.Status == Completed))
                .Select(m => new { m.Step, m.Status }))
            .ToList();

        var completed = rows.Where(r => r.Status == Completed).Select(r => r.Step).ToHashSet();
        return rows.Where(r => r.Status == Failed && !completed.Contains(r.Step)).Select(r => r.Step).Distinct().ToList();
    }

    /// <summary>Hata cozulunce bekletilen adimlar gerceklesme sirasiyla gonderilmek uzere kuyruga doner.</summary>
    private async Task ReleaseHeldAsync(string transactionId, CancellationToken ct)
    {
        var saved = await _db.IntegraOpsOutbox
            .Where(m => m.TransactionId == transactionId && m.State == IntegraOpsOutboxState.Held)
            .ToListAsync(ct);
        var local = _db.IntegraOpsOutbox.Local
            .Where(m => m.TransactionId == transactionId && m.State == IntegraOpsOutboxState.Held);

        foreach (var message in saved.Union(local))
            message.State = IntegraOpsOutboxState.Pending;
    }

    private async Task<DateTime?> LatestOccurredAtAsync(string transactionId, CancellationToken ct)
    {
        var saved = await _db.IntegraOpsOutbox.AsNoTracking()
            .Where(m => m.TransactionId == transactionId)
            .MaxAsync(m => (DateTime?)m.OccurredAt, ct);
        var local = _db.IntegraOpsOutbox.Local
            .Where(m => m.TransactionId == transactionId)
            .Max(m => (DateTime?)m.OccurredAt);

        if (saved is null) return local;
        if (local is null) return saved;
        return saved > local ? saved : local;
    }

    /// <summary>Ayni siparis + adim + durum her zaman ayni eventId'yi uretir (tekrar teslimde cift kayit olmaz).</summary>
    public static Guid CreateEventId(string transactionId, string step, string status)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes($"{transactionId}|{step}|{status}"));
        return new Guid(hash.AsSpan(0, 16));
    }

    private static string Truncate(string value, int maxLength) =>
        value.Length <= maxLength ? value : value[..maxLength];
}
