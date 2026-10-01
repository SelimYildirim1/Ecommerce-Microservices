using System.Net;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Order.API.Data;
using Order.API.Entities;

namespace Order.API.Services.IntegraOps;

/// <summary>
/// Outbox'taki olaylari IntegraOps'a gonderir. Gecici hatalarda ayni eventId ile ustel
/// beklemeyle yeniden dener; kalici retlerde kaydi ayirir.
/// </summary>
public class IntegraOpsSender : BackgroundService
{
    public const string HttpClientName = "integraops";

    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(2);
    // IntegraOps bir siparişin olayları arasında 2 dakikadan uzun gönderim boşluğu istemiyor;
    // yeniden deneme aralığı bu yüzden 1 dakikayı geçmez.
    private static readonly TimeSpan MaxBackoff = TimeSpan.FromMinutes(1);
    private const int BatchSize = 50;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IntegraOpsOptions _options;
    private readonly ILogger<IntegraOpsSender> _logger;

    public IntegraOpsSender(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        IOptions<IntegraOpsOptions> options,
        ILogger<IntegraOpsSender> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.IsConfigured)
        {
            _logger.LogInformation("IntegraOps bildirimi kapalı (Enabled/BaseUrl/ApiKey eksik).");
            return;
        }

        if (_options.SendingPaused)
        {
            _logger.LogWarning("IntegraOps gönderimi duraklatıldı; olaylar kuyrukta birikecek.");
            return;
        }

        _logger.LogInformation("IntegraOps göndericisi başladı. Adres={BaseUrl}, Akış={Flow}", _options.BaseUrl, _options.Flow);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendDueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "IntegraOps kuyruğu işlenirken hata oluştu.");
            }

            try
            {
                await Task.Delay(PollInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task SendDueAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<OrderDbContext>();

        var now = DateTime.UtcNow;
        var due = await db.IntegraOpsOutbox
            .Where(m => m.State == IntegraOpsOutboxState.Pending && m.NextAttemptAt <= now)
            .OrderBy(m => m.OccurredAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (due.Count == 0) return;

        var client = _httpClientFactory.CreateClient(HttpClientName);
        foreach (var message in due)
        {
            await SendAsync(client, message, ct);
            await db.SaveChangesAsync(ct);
        }
    }

    private async Task SendAsync(HttpClient client, IntegraOpsOutboxMessage message, CancellationToken ct)
    {
        message.Attempts++;

        var payload = new EventPayload(
            message.Id,
            _options.Flow,
            message.TransactionId,
            message.Step,
            message.Status,
            new DateTimeOffset(DateTime.SpecifyKind(message.OccurredAt, DateTimeKind.Utc)),
            message.Error,
            message.Group);

        try
        {
            using var response = await client.PostAsJsonAsync("api/v1/events", payload, ct);

            if (response.StatusCode is HttpStatusCode.OK or HttpStatusCode.Accepted)
            {
                message.State = IntegraOpsOutboxState.Sent;
                message.SentAt = DateTime.UtcNow;
                message.LastError = null;
                return;
            }

            var body = await response.Content.ReadAsStringAsync(ct);
            message.LastError = $"{(int)response.StatusCode}: {(body.Length > 900 ? body[..900] : body)}";

            if (IsPermanentRejection(response.StatusCode))
            {
                message.State = IntegraOpsOutboxState.Rejected;
                _logger.LogError(
                    "IntegraOps olayı kalıcı olarak reddetti. Sipariş={TransactionId}, Adım={Step}, Yanıt={Error}",
                    message.TransactionId, message.Step, message.LastError);
                return;
            }
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            message.LastError = ex.Message.Length > 900 ? ex.Message[..900] : ex.Message;
        }

        var backoff = TimeSpan.FromSeconds(Math.Min(MaxBackoff.TotalSeconds, 5 * Math.Pow(2, Math.Min(message.Attempts, 10))));
        message.NextAttemptAt = DateTime.UtcNow + backoff;
        _logger.LogWarning(
            "IntegraOps olayı gönderilemedi, {Backoff} sonra yeniden denenecek. Sipariş={TransactionId}, Adım={Step}, Hata={Error}",
            backoff, message.TransactionId, message.Step, message.LastError);
    }

    private static bool IsPermanentRejection(HttpStatusCode status) => status is
        HttpStatusCode.BadRequest or HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or
        HttpStatusCode.NotFound or HttpStatusCode.Conflict or HttpStatusCode.UnprocessableEntity;

    private record EventPayload(
        [property: JsonPropertyName("eventId")] Guid EventId,
        [property: JsonPropertyName("flow")] string Flow,
        [property: JsonPropertyName("transactionId")] string TransactionId,
        [property: JsonPropertyName("step")] string Step,
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("occurredAt")] DateTimeOffset OccurredAt,
        [property: JsonPropertyName("error"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Error,
        [property: JsonPropertyName("group"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Group);
}
