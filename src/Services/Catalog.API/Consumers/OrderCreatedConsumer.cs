using MassTransit;
using Core.Shared.Events;
using Catalog.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Consumers;

public class OrderCreatedConsumer : IConsumer<OrderCreatedEvent>
{
    private readonly CatalogDbContext _context;
    private readonly ILogger<OrderCreatedConsumer> _logger;

    public OrderCreatedConsumer(CatalogDbContext context, ILogger<OrderCreatedConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderCreatedEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("OrderCreatedEvent alındı. Stok kontrolü başlıyor. OrderId={OrderId}", msg.OrderId);

        if (msg.OrderItems == null || msg.OrderItems.Count == 0)
        {
            // Siparişte ürün yoksa, teknik olarak stok sorunu yoktur.
            // Ama 0 tutarlı bir ödeme vs. olabilir, akışı bozmamak için onay veriyoruz.
            await PublishStockReserved(context);
            return;
        }

        // Kullanılacak ürünleri hafızaya alıp toplu kontrol edelim (Transaction mantığı)
        // Aynı üründen birden fazla satır olabilir, group by ile toplam adedi bulalım.
        var orderItemGroups = msg.OrderItems
            .GroupBy(x => x.ProductId)
            .ToList();

        var productsToUpdate = new List<Catalog.API.Entities.Product>();

        foreach (var group in orderItemGroups)
        {
            if (!Guid.TryParse(group.Key, out var productId))
            {
                await PublishStockNotReserved(context, $"Geçersiz ProductId: {group.Key}");
                return;
            }

            var totalRequestedQty = group.Sum(x => x.Quantity);

            // Veritabanından ürünü bul
            var product = await _context.Products.FindAsync(productId);

            if (product == null)
            {
                await PublishStockNotReserved(context, $"Ürün bulunamadı. Id={productId}");
                return;
            }

            if (product.StockQuantity < totalRequestedQty)
            {
                await PublishStockNotReserved(context, 
                    $"Yetersiz stok. Ürün: {product.Name}, Stok: {product.StockQuantity}, İstenen: {totalRequestedQty}");
                return;
            }

            // Bu ürün onaylandı, listeye ekle (daha sonra güncellemek için)
            // Not: EF Core tracking sayesinde bellekteki bu nesneyi güncelleyince SaveChanges ile yansır.
            // Ancak henüz güncellemiyoruz, tüm ürünler onaylanınca düşeceğiz.
            productsToUpdate.Add(product);
        }

        // --- BURAYA GELDİYSEK TÜM ÜRÜNLER İÇİN STOK YETERLİDİR ---

        // 1. Stokları düş
        foreach (var group in orderItemGroups)
        {
            var product = productsToUpdate.First(p => p.Id == Guid.Parse(group.Key));
            var qty = group.Sum(x => x.Quantity);
            product.StockQuantity -= qty;
        }

        // 2. DB'ye kaydet
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Stoklar güncellendi. OrderId={OrderId}", msg.OrderId);

        // 3. Başarılı eventini fırlat (Ödeme servisi bunu bekliyor)
        await PublishStockReserved(context);
    }

    private async Task PublishStockReserved(ConsumeContext<OrderCreatedEvent> context)
    {
        var msg = context.Message;
        var reservedEvent = new StockReservedEvent
        {
            OrderId = msg.OrderId,
            BuyerId = msg.BuyerId,
            Email = msg.Email,
            TotalPrice = msg.TotalPrice,
            CardName = msg.CardName,
            CardNumber = msg.CardNumber,
            Expiration = msg.Expiration,
            CVV = msg.CVV,
            OrderItems = msg.OrderItems
        };
        
        // Eventi yayımla
        await context.Publish(reservedEvent);
        _logger.LogInformation("StockReservedEvent yayımlandı. OrderId={OrderId}", msg.OrderId);
    }

    private async Task PublishStockNotReserved(ConsumeContext<OrderCreatedEvent> context, string reason)
    {
        var msg = context.Message;
        _logger.LogWarning("Stok rezervasyonu başarısız. OrderId={OrderId}, Sebep={Reason}", msg.OrderId, reason);

        var failEvent = new StockNotReservedEvent
        {
            OrderId = msg.OrderId,
            BuyerId = msg.BuyerId,
            Email = msg.Email,
            Reason = reason
        };

        await context.Publish(failEvent);
    }
}
