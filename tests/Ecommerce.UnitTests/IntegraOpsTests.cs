using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Order.API.Data;
using Order.API.Domain.AggregatesModel.OrderAggregate;
using Order.API.Entities;
using Order.API.Services.IntegraOps;
using Xunit;
using OrderEntity = Order.API.Entities.Order;

namespace Ecommerce.UnitTests;

public class IntegraOpsTests
{
    private static OrderDbContext NewDb(string? name = null) =>
        new(new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase(name ?? Guid.NewGuid().ToString())
            .Options);

    private static IntegraOpsOptions Options(bool simulation = true, decimal vipMinTotal = 0) => new()
    {
        Enabled = true,
        BaseUrl = "https://integraops.test",
        ApiKey = "test-key",
        SimulationEnabled = simulation,
        VipMinTotal = vipMinTotal
    };

    private static IntegraOpsNotifier Notifier(OrderDbContext db, IntegraOpsOptions options) =>
        new(db, Microsoft.Extensions.Options.Options.Create(options), NullLogger<IntegraOpsNotifier>.Instance);

    private static OrderEntity NewOrder(
        string number, string? note = null, string country = "TR", decimal total = 100, bool giftWrap = false)
    {
        var order = new OrderEntity("buyer-1", new Address("Sokak 1", "İstanbul", "", country, "34000"), note);
        order.SetOrderNumber(number);
        order.SetTotals(total, 0, null, 0);
        order.SetGiftOptions(giftWrap, null);
        return order;
    }

    [Fact]
    public void Simulation_ParsesAllTagKinds()
    {
        var sim = IntegraOpsSimulation.Parse(
            "Kapıya bırakın #sim:drop=invoice-created #sim:fail=payment-completed #sim:delay=shipped:1200 #sim:group=vip");

        Assert.True(sim.IsDropped("invoice-created"));
        Assert.True(sim.IsFailed("payment-completed"));
        Assert.Equal(TimeSpan.FromSeconds(1200), sim.DelayFor("shipped"));
        Assert.Equal(TimeSpan.Zero, sim.DelayFor("delivered"));
        Assert.Equal("vip", sim.Group);
    }

    [Fact]
    public void EventId_IsStablePerOrderStepAndStatus()
    {
        var first = IntegraOpsNotifier.CreateEventId("YS-260930-0001", "shipped", "completed");

        Assert.Equal(first, IntegraOpsNotifier.CreateEventId("YS-260930-0001", "shipped", "completed"));
        Assert.NotEqual(first, IntegraOpsNotifier.CreateEventId("YS-260930-0001", "shipped", "failed"));
        Assert.NotEqual(first, IntegraOpsNotifier.CreateEventId("YS-260930-0002", "shipped", "completed"));
    }

    [Fact]
    public async Task Disabled_WritesNothing()
    {
        using var db = NewDb();
        var notifier = Notifier(db, new IntegraOpsOptions { Enabled = false });

        await notifier.TrackAsync(NewOrder("YS-1"), IntegraOpsNotifier.OrderCreated);
        await db.SaveChangesAsync();

        Assert.Empty(db.IntegraOpsOutbox);
    }

    [Fact]
    public async Task OrdersCreatedBeforeIntegration_AreNotReported()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options());

        await notifier.TrackShippedAsync(NewOrder("YS-OLD"));
        await db.SaveChangesAsync();

        Assert.Empty(db.IntegraOpsOutbox);
    }

    [Fact]
    public async Task RedeliveredStep_IsWrittenOnce()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options());
        var order = NewOrder("YS-2");

        await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await db.SaveChangesAsync();
        await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await db.SaveChangesAsync();

        Assert.Single(db.IntegraOpsOutbox);
    }

    [Fact]
    public async Task Paid_ReportsPaymentGiftWrapAndInvoice_InOrder()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options());
        var order = NewOrder("YS-3", giftWrap: true);

        await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await notifier.TrackPaidAsync(order);
        await db.SaveChangesAsync();

        var steps = db.IntegraOpsOutbox.OrderBy(m => m.OccurredAt).ThenBy(m => m.CreatedAt).Select(m => m.Step).ToList();
        Assert.Equal(new[] { "order-created", "payment-completed", "gift-wrap", "invoice-created" }, steps);
        Assert.All(db.IntegraOpsOutbox, m => Assert.Null(m.Group));
    }

    [Fact]
    public async Task SimulationTags_DropAndDelaySteps()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options());
        var order = NewOrder("YS-4", "#sim:drop=invoice-created #sim:delay=payment-completed:600");

        await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await notifier.TrackPaidAsync(order);
        await db.SaveChangesAsync();

        var created = db.IntegraOpsOutbox.Single(m => m.Step == "order-created");
        var payment = db.IntegraOpsOutbox.Single(m => m.Step == "payment-completed");
        var invoice = db.IntegraOpsOutbox.Single(m => m.Step == "invoice-created");

        Assert.Equal("completed", payment.Status);
        Assert.True(payment.OccurredAt - created.OccurredAt >= TimeSpan.FromSeconds(599));
        Assert.Equal(payment.OccurredAt, payment.NextAttemptAt);
        Assert.Equal(IntegraOpsOutboxState.Dropped, invoice.State);
        // Gecikmeli adımdan sonra gelen adım ondan önce gerçekleşmiş görünmez
        Assert.True(invoice.OccurredAt >= payment.OccurredAt);
    }

    [Fact]
    public async Task FailedStep_StopsTheFlow()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options());
        var order = NewOrder("YS-5", "#sim:fail=payment-completed", giftWrap: true);

        await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await notifier.TrackAsync(order, IntegraOpsNotifier.StockReserved);
        await notifier.TrackPaidAsync(order);
        await db.SaveChangesAsync();
        await notifier.TrackShippedAsync(order);
        await db.SaveChangesAsync();

        var payment = db.IntegraOpsOutbox.Single(m => m.Step == "payment-completed");
        Assert.Equal("failed", payment.Status);
        Assert.NotNull(payment.Error);
        // Hediye paketi, fatura ve kargo gonderilmez, bekletilir
        Assert.Equal(
            new[] { "order-created", "payment-completed", "stock-reserved" },
            db.IntegraOpsOutbox.Where(m => m.State == IntegraOpsOutboxState.Pending)
                .Select(m => m.Step).OrderBy(s => s).ToArray());
        Assert.Equal(
            new[] { "gift-wrap", "invoice-created", "shipped" },
            db.IntegraOpsOutbox.Where(m => m.State == IntegraOpsOutboxState.Held)
                .Select(m => m.Step).OrderBy(s => s).ToArray());

        // Hatadan sonra iptal yine bildirilir (IntegraOps'taki basarisiz alarmini kapatir)
        await notifier.TrackCancelledAsync(order, "Failed");
        await db.SaveChangesAsync();

        Assert.Single(db.IntegraOpsOutbox, m => m.Status == "cancelled");
    }

    [Fact]
    public async Task FailedStep_SucceedingOnRetry_ResumesTheFlow()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options());
        var order = NewOrder("YS-6");

        await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await notifier.TrackAsync(order, IntegraOpsNotifier.PaymentCompleted, IntegraOpsNotifier.Failed, "Kart reddedildi");
        await db.SaveChangesAsync();
        // Paralel daldaki stok ayrimi hatadan sonra gelir ve bekletilir
        await notifier.TrackAsync(order, IntegraOpsNotifier.StockReserved);
        await db.SaveChangesAsync();

        var stock = db.IntegraOpsOutbox.Single(m => m.Step == "stock-reserved");
        Assert.Equal(IntegraOpsOutboxState.Held, stock.State);

        // Musteri odemeyi yeniden dener ve basarili olur
        await notifier.TrackPaidAsync(order);
        await db.SaveChangesAsync();

        var payments = db.IntegraOpsOutbox.Where(m => m.Step == "payment-completed").ToList();
        Assert.Equal(new[] { "completed", "failed" }, payments.Select(m => m.Status).OrderBy(s => s).ToArray());
        Assert.NotEqual(payments[0].Id, payments[1].Id);
        var retry = payments.Single(m => m.Status == "completed");
        Assert.True(retry.OccurredAt > payments.Single(m => m.Status == "failed").OccurredAt);

        // Bekletilen stok olayi kaybolmaz, fatura da normal akista gider
        Assert.Equal(IntegraOpsOutboxState.Pending, db.IntegraOpsOutbox.Single(m => m.Step == "stock-reserved").State);
        Assert.Equal(IntegraOpsOutboxState.Pending, db.IntegraOpsOutbox.Single(m => m.Step == "invoice-created").State);
        Assert.DoesNotContain(db.IntegraOpsOutbox, m => m.State == IntegraOpsOutboxState.Held);
    }

    [Fact]
    public async Task DeliveredWithoutShipping_ReportsMissingStepsFirst()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options());
        var domestic = NewOrder("YS-7");
        var export = NewOrder("YS-8", country: "DE");
        var shippedEarlier = NewOrder("YS-9");

        foreach (var order in new[] { domestic, export, shippedEarlier })
            await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await notifier.TrackStatusChangeAsync(shippedEarlier, "Paid", "Shipped");
        await db.SaveChangesAsync();

        foreach (var order in new[] { domestic, export })
            await notifier.TrackStatusChangeAsync(order, "Paid", "Delivered");
        await notifier.TrackStatusChangeAsync(shippedEarlier, "Shipped", "Delivered");
        await db.SaveChangesAsync();

        string[] Steps(string txn) => db.IntegraOpsOutbox.Where(m => m.TransactionId == txn)
            .OrderBy(m => m.OccurredAt).Select(m => m.Step).ToArray();

        Assert.Equal(new[] { "order-created", "shipped", "delivered" }, Steps("YS-7"));
        Assert.Equal(new[] { "order-created", "customs-declared", "shipped", "delivered" }, Steps("YS-8"));
        Assert.Equal(new[] { "order-created", "shipped", "delivered" }, Steps("YS-9"));
    }

    [Fact]
    public async Task SimulationTags_AreIgnoredWhenSimulationIsOff()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options(simulation: false));
        var order = NewOrder("YS-5", "#sim:drop=order-created #sim:group=vip");

        await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await db.SaveChangesAsync();

        var message = db.IntegraOpsOutbox.Single();
        Assert.Equal(IntegraOpsOutboxState.Pending, message.State);
        Assert.Null(message.Group);
    }

    [Fact]
    public async Task ExportOrder_ReportsCustomsBeforeShipped()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options());
        var order = NewOrder("YS-6", country: "Germany");

        await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await notifier.TrackShippedAsync(order);
        await db.SaveChangesAsync();

        Assert.Contains(db.IntegraOpsOutbox, m => m.Step == "customs-declared");
        Assert.All(db.IntegraOpsOutbox, m => Assert.Equal("export", m.Group));
    }

    [Fact]
    public async Task VipGroup_FollowsOrderTotalThreshold()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options(vipMinTotal: 5000));

        await notifier.TrackAsync(NewOrder("YS-7", total: 7500), IntegraOpsNotifier.OrderCreated);
        await notifier.TrackAsync(NewOrder("YS-8", total: 100), IntegraOpsNotifier.OrderCreated);
        await db.SaveChangesAsync();

        Assert.Equal("vip", db.IntegraOpsOutbox.Single(m => m.TransactionId == "YS-7").Group);
        Assert.Null(db.IntegraOpsOutbox.Single(m => m.TransactionId == "YS-8").Group);
    }

    [Fact]
    public async Task Cancel_IsReportedOnTheStepTheOrderWasWaitingFor()
    {
        using var db = NewDb();
        var notifier = Notifier(db, Options());
        var order = NewOrder("YS-9");

        await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
        await notifier.TrackCancelledAsync(order, previousStatus: "Paid");
        await db.SaveChangesAsync();

        var cancelled = db.IntegraOpsOutbox.Single(m => m.Status == "cancelled");
        Assert.Equal("shipped", cancelled.Step);
    }

    [Fact]
    public async Task Sender_PostsContractBody_RetriesTransientAndSetsAsidePermanent()
    {
        var dbName = Guid.NewGuid().ToString();
        var handler = new RecordingHandler();
        var options = Options();

        var services = new ServiceCollection();
        services.AddDbContext<OrderDbContext>(o => o.UseInMemoryDatabase(dbName));
        services.AddHttpClient(IntegraOpsSender.HttpClientName, c =>
            {
                c.BaseAddress = new Uri(options.BaseUrl + "/");
                c.DefaultRequestHeaders.Add("X-API-Key", options.ApiKey);
            })
            .ConfigurePrimaryHttpMessageHandler(() => handler);
        using var provider = services.BuildServiceProvider();

        using (var db = NewDb(dbName))
        {
            var notifier = Notifier(db, options);
            var order = NewOrder("YS-10", "#sim:group=vip #sim:fail=stock-reserved");
            await notifier.TrackAsync(order, IntegraOpsNotifier.OrderCreated);
            await notifier.TrackAsync(order, IntegraOpsNotifier.StockReserved);
            await notifier.TrackAsync(NewOrder("YS-REJECT"), IntegraOpsNotifier.OrderCreated);
            await db.SaveChangesAsync();
        }

        var sender = new IntegraOpsSender(
            provider.GetRequiredService<IServiceScopeFactory>(),
            provider.GetRequiredService<IHttpClientFactory>(),
            Microsoft.Extensions.Options.Options.Create(options),
            NullLogger<IntegraOpsSender>.Instance);

        await sender.StartAsync(CancellationToken.None);
        await WaitUntilAsync(() =>
        {
            using var db = NewDb(dbName);
            return db.IntegraOpsOutbox.Count(m => m.State == IntegraOpsOutboxState.Sent) == 2 &&
                   db.IntegraOpsOutbox.Any(m => m.State == IntegraOpsOutboxState.Rejected);
        });
        await sender.StopAsync(CancellationToken.None);

        using var check = NewDb(dbName);
        var rejected = check.IntegraOpsOutbox.Single(m => m.TransactionId == "YS-REJECT");
        Assert.Equal(IntegraOpsOutboxState.Rejected, rejected.State);
        Assert.StartsWith("404", rejected.LastError);

        // order-created ilk denemede 503 aldı, aynı eventId ile yeniden gönderildi
        var createdId = IntegraOpsNotifier.CreateEventId("YS-10", "order-created", "completed").ToString();
        var createdBodies = handler.Bodies.Where(b => b.GetProperty("eventId").GetString() == createdId).ToList();
        Assert.Equal(2, createdBodies.Count);

        var created = createdBodies[0];
        Assert.Equal("ecommerce-order", created.GetProperty("flow").GetString());
        Assert.Equal("YS-10", created.GetProperty("transactionId").GetString());
        Assert.Equal("order-created", created.GetProperty("step").GetString());
        Assert.Equal("completed", created.GetProperty("status").GetString());
        Assert.Equal("vip", created.GetProperty("group").GetString());
        Assert.False(created.TryGetProperty("error", out _));
        Assert.EndsWith("+00:00", created.GetProperty("occurredAt").GetString());

        var stock = handler.Bodies.Single(b => b.GetProperty("step").GetString() == "stock-reserved");
        Assert.Equal("failed", stock.GetProperty("status").GetString());
        Assert.False(string.IsNullOrEmpty(stock.GetProperty("error").GetString()));
        Assert.All(handler.ApiKeys, key => Assert.Equal("test-key", key));
    }

    private static async Task WaitUntilAsync(Func<bool> condition)
    {
        var deadline = DateTime.UtcNow.AddSeconds(30);
        while (DateTime.UtcNow < deadline)
        {
            if (condition()) return;
            await Task.Delay(200);
        }

        Assert.Fail("Beklenen durum 30 saniyede oluşmadı.");
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        private bool _failedOnce;
        public List<JsonElement> Bodies { get; } = new();
        public List<string?> ApiKeys { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken)).RootElement;
            lock (Bodies)
            {
                Bodies.Add(body);
                ApiKeys.Add(request.Headers.TryGetValues("X-API-Key", out var values) ? values.Single() : null);
            }

            if (body.GetProperty("transactionId").GetString() == "YS-REJECT")
                return new HttpResponseMessage(HttpStatusCode.NotFound) { Content = new StringContent("akış bulunamadı") };

            if (!_failedOnce)
            {
                _failedOnce = true;
                return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
            }

            return new HttpResponseMessage(HttpStatusCode.Accepted);
        }
    }
}
