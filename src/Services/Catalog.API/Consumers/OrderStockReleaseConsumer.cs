using MassTransit;
using Core.Shared.Events;
using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Services;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Consumers;

/// <summary>
/// Sipariş iptal / iade sonrası stoğu geri ekler (OrderStockReleaseEvent).
///
/// Olaydaki adetler esas alınır; böylece kısmi iadelerde yalnızca iade edilen
/// adet geri eklenir. Aynı olay tekrar işlenirse ledger kaydı sayesinde stok
/// ikinci kez artmaz ve hiçbir varyant satılan adetten fazla geri eklenmez.
/// </summary>
public class OrderStockReleaseConsumer : IConsumer<OrderStockReleaseEvent>
{
    private readonly CatalogDbContext _context;
    private readonly StockLedger _ledger;
    private readonly ILogger<OrderStockReleaseConsumer> _logger;

    public OrderStockReleaseConsumer(
        CatalogDbContext context,
        StockLedger ledger,
        ILogger<OrderStockReleaseConsumer> logger)
    {
        _context = context;
        _ledger = ledger;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderStockReleaseEvent> context)
    {
        var msg = context.Message;
        var ct = context.CancellationToken;

        var orderReference = msg.OrderId.ToString();

        // Kismi iadelerde her talep kendi anahtarini tasir. Anahtar siparis
        // referansinin arkasina eklenir; boylece hem talep bazli tekrar kontrolu
        // hem siparis bazli toplam kontrolu tek sorguyla yapilabilir.
        var ledgerReference = string.IsNullOrWhiteSpace(msg.ReferenceKey) || msg.ReferenceKey == orderReference
            ? orderReference
            : $"{orderReference}:{msg.ReferenceKey}";

        _logger.LogInformation(
            "OrderStockReleaseEvent alındı. OrderId={OrderId}, Type={Type}, Reference={Reference}, Reason={Reason}",
            msg.OrderId, msg.ReleaseType, ledgerReference, msg.Reason);

        var saleMovements = await _context.StockMovements
            .Where(m => m.Reference == orderReference && m.Type == StockMovementType.Sale)
            .ToListAsync(ct);

        var soldByVariant = saleMovements
            .GroupBy(m => m.ProductVariantId)
            .ToDictionary(g => g.Key, g => g.Sum(m => Math.Abs(m.Quantity)));

        var returnMovements = await _context.StockMovements
            .Where(m =>
                m.Type == StockMovementType.Return &&
                m.Reference != null &&
                (m.Reference == orderReference || m.Reference.StartsWith(orderReference + ":")))
            .ToListAsync(ct);

        var restoredForOrder = returnMovements
            .GroupBy(m => m.ProductVariantId)
            .ToDictionary(g => g.Key, g => g.Sum(m => m.Quantity));

        var restoredForReference = returnMovements
            .Where(m => m.Reference == ledgerReference)
            .GroupBy(m => m.ProductVariantId)
            .ToDictionary(g => g.Key, g => g.Sum(m => m.Quantity));

        var requested = await BuildRequestedQuantitiesAsync(msg, soldByVariant, saleMovements, ct);

        var restoredAny = false;

        foreach (var (variantId, requestedQuantity) in requested)
        {
            var alreadyForReference = restoredForReference.GetValueOrDefault(variantId);
            var toRestore = requestedQuantity - alreadyForReference;
            if (toRestore <= 0) continue;

            // Satilan adetten fazlasi geri eklenemez
            if (soldByVariant.TryGetValue(variantId, out var sold))
            {
                var capacity = sold - restoredForOrder.GetValueOrDefault(variantId);
                toRestore = Math.Min(toRestore, capacity);
            }

            if (toRestore <= 0) continue;

            var variant = await _context.ProductVariants
                .Include(v => v.Product)
                .FirstOrDefaultAsync(v => v.Id == variantId, ct);

            if (variant is null)
            {
                _logger.LogWarning("Varyant bulunamadı. VariantId={VariantId}", variantId);
                continue;
            }

            var previousStock = variant.StockQuantity;
            variant.StockQuantity += toRestore;

            _ledger.Record(
                variant,
                StockMovementType.Return,
                toRestore,
                previousStock,
                reference: ledgerReference,
                note: $"{msg.ReleaseType}: {msg.Reason}");

            restoredForOrder[variantId] = restoredForOrder.GetValueOrDefault(variantId) + toRestore;
            restoredAny = true;

            _logger.LogInformation(
                "Stok geri eklendi ({Type}). {Sku}: {Prev} -> {New} (+{Qty})",
                msg.ReleaseType, variant.Sku, previousStock, variant.StockQuantity, toRestore);
        }

        if (restoredAny)
            await _context.SaveChangesAsync(ct);
        else
            _logger.LogInformation(
                "Geri eklenecek stok yok veya zaten iade edilmiş. Reference={Reference}", ledgerReference);
    }

    /// <summary>
    /// Olaydaki kalemleri varyant bazli adetlere cevirir. Kalem yoksa siparisin
    /// tamami iade ediliyor kabul edilir (iptal akisinin eski davranisi).
    /// </summary>
    private async Task<Dictionary<Guid, int>> BuildRequestedQuantitiesAsync(
        OrderStockReleaseEvent msg,
        Dictionary<Guid, int> soldByVariant,
        List<StockMovement> saleMovements,
        CancellationToken ct)
    {
        var requested = new Dictionary<Guid, int>();

        foreach (var group in (msg.OrderItems ?? new List<OrderItemMessage>()).GroupBy(i => i.ProductId))
        {
            if (!Guid.TryParse(group.Key, out var id)) continue;

            var quantity = group.Sum(i => i.Quantity);
            if (quantity <= 0) continue;

            foreach (var (variantId, allocated) in await AllocateAsync(id, quantity, soldByVariant, saleMovements, ct))
                requested[variantId] = requested.GetValueOrDefault(variantId) + allocated;
        }

        if (requested.Count == 0)
            foreach (var (variantId, sold) in soldByVariant)
                requested[variantId] = sold;

        return requested;
    }

    /// <summary>
    /// Kalemdeki kimlik once varyant, sonra urun kimligi olarak degerlendirilir.
    /// Bir urunun ayni sipariste birden fazla varyanti satildiysa adet, satis
    /// hareketlerindeki adetlere gore paylastirilir.
    /// </summary>
    private async Task<List<(Guid VariantId, int Quantity)>> AllocateAsync(
        Guid id,
        int quantity,
        Dictionary<Guid, int> soldByVariant,
        List<StockMovement> saleMovements,
        CancellationToken ct)
    {
        if (soldByVariant.ContainsKey(id))
            return new List<(Guid, int)> { (id, quantity) };

        var productSales = saleMovements
            .Where(m => m.ProductId == id)
            .GroupBy(m => m.ProductVariantId)
            .Select(g => (VariantId: g.Key, Sold: g.Sum(m => Math.Abs(m.Quantity))))
            .OrderByDescending(x => x.Sold)
            .ToList();

        if (productSales.Count > 0)
        {
            var allocation = new List<(Guid, int)>();
            var remaining = quantity;

            foreach (var (variantId, sold) in productSales)
            {
                if (remaining <= 0) break;
                var take = Math.Min(remaining, sold);
                allocation.Add((variantId, take));
                remaining -= take;
            }

            // Satis kaydindan fazla iade istendiyse kalani en cok satilan varyanta yaz
            if (remaining > 0 && allocation.Count > 0)
            {
                var (firstVariant, firstQty) = allocation[0];
                allocation[0] = (firstVariant, firstQty + remaining);
            }

            return allocation;
        }

        // Siparis icin satis kaydi yok (or. odeme oncesi iptal). Kimligi
        // dogrudan varyant, bulunamazsa urun kimligi kabul et.
        var variantExists = await _context.ProductVariants
            .AnyAsync(v => v.Id == id, ct);

        if (variantExists)
            return new List<(Guid, int)> { (id, quantity) };

        var fallbackVariantId = await _context.ProductVariants
            .Where(v => v.ProductId == id && v.IsActive)
            .OrderByDescending(v => v.StockQuantity)
            .Select(v => v.Id)
            .FirstOrDefaultAsync(ct);

        return fallbackVariantId == Guid.Empty
            ? new List<(Guid, int)>()
            : new List<(Guid, int)> { (fallbackVariantId, quantity) };
    }
}
