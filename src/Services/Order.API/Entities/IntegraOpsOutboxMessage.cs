namespace Order.API.Entities;

/// <summary>
/// IntegraOps'a gonderilecek is olayi. Siparis degisikligiyle ayni transaction'da yazilir;
/// HTTP cagrisini ayri bir gonderici (IntegraOpsSender) yapar.
/// </summary>
public class IntegraOpsOutboxMessage
{
    /// <summary>IntegraOps eventId. Tekrar gonderimde ayni kalir.</summary>
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    /// <summary>Siparis numarasi (YS-yyMMdd-XXXX).</summary>
    public string TransactionId { get; set; } = default!;

    public string Step { get; set; } = default!;

    /// <summary>completed | failed | skipped | cancelled</summary>
    public string Status { get; set; } = default!;

    public string? Error { get; set; }

    /// <summary>vip | export | null</summary>
    public string? Group { get; set; }

    /// <summary>Adimin gerceklesme ani. Gonderim bu andan once yapilmaz.</summary>
    public DateTime OccurredAt { get; set; }

    public IntegraOpsOutboxState State { get; set; } = IntegraOpsOutboxState.Pending;

    public int Attempts { get; set; }
    public DateTime NextAttemptAt { get; set; }
    public DateTime? SentAt { get; set; }
    public string? LastError { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum IntegraOpsOutboxState
{
    Pending = 0,
    Sent = 1,

    /// <summary>Kalici ret (400/401/403/404/409). Duzeltilmeden tekrar denenmez.</summary>
    Rejected = 2,

    /// <summary>Simulasyon etiketiyle bilincli olarak gonderilmedi.</summary>
    Dropped = 3,

    /// <summary>Cozulmemis bir hata varken bekletiliyor; ayni adim basarili olunca Pending'e doner.</summary>
    Held = 4
}
