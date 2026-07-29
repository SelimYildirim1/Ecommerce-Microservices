using Basket.API.Entities;
using Basket.API.Repositories;
using Basket.API.Security;
using Basket.API.Services; // <-- YENİ: CatalogService'i kullanabilmek için ekledik
using Core.Shared.Events; 
using MassTransit;        
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Basket.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class BasketController : ControllerBase
{
    private readonly IBasketRepository _repository;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<BasketController> _logger;
    private readonly CatalogService _catalogService; // <-- 1. YENİ: Servisi tanımladık
    private readonly PromotionService _promotionService;
    private readonly ShippingService _shippingService;

    // Constructor'da CatalogService'i de istiyoruz (Dependency Injection)
    public BasketController(
        IBasketRepository repository, 
        IPublishEndpoint publishEndpoint,
        ILogger<BasketController> logger,
        CatalogService catalogService, // <-- 2. YENİ: Parametre olarak ekledik
        PromotionService promotionService,
        ShippingService shippingService)
    {
        _repository = repository;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
        _catalogService = catalogService; // <-- 3. YENİ: Atama yaptık
        _promotionService = promotionService;
        _shippingService = shippingService;
    }

    /// <summary>
    /// Sepet ozeti: ara toplam, kupon/kampanya indirimi, kargo ucreti ve genel toplam.
    /// Checkout ekrani odeme oncesi bu ucu de gostermek icin cagirir.
    /// </summary>
    [HttpPost("summary")]
    public async Task<ActionResult<BasketSummary>> GetSummary([FromBody] BasketSummaryRequest request)
    {
        if (!CallerIdentity.CanAccessBasket(User, request.UserName))
            return Forbid();

        var basket = await _repository.GetBasket(request.UserName);

        if (basket is null || basket.Items.Count == 0)
            return Ok(new BasketSummary { Message = "Sepetiniz boş." });

        return Ok(await BuildSummary(basket, request.CouponCode, request.ShippingCarrierId));
    }

    /// <summary>Sepete uygun kargo secenekleri.</summary>
    [HttpGet("{userName}/shipping-options")]
    public async Task<ActionResult<List<ShippingOptionDto>>> GetShippingOptions(string userName)
    {
        if (!CallerIdentity.CanAccessBasket(User, userName))
            return Forbid();

        var basket = await _repository.GetBasket(userName);

        if (basket is null || basket.Items.Count == 0)
            return Ok(new List<ShippingOptionDto>());

        var itemCount = basket.Items.Sum(i => i.Quantity);
        return Ok(await _shippingService.GetQuotesAsync(basket.TotalPrice, itemCount));
    }

    private async Task<BasketSummary> BuildSummary(
        ShoppingCart basket, string? couponCode, Guid? carrierId)
    {
        var subtotal = basket.TotalPrice;

        var lines = basket.Items
            .Select(i => new BasketLineDto(i.ProductId, null, i.Price, i.Quantity))
            .ToList();

        var summary = new BasketSummary { Subtotal = subtotal };

        // Kupon kampanyayi ezer; ikisi ayni anda uygulanmaz
        DiscountResultDto? discount = null;

        if (!string.IsNullOrWhiteSpace(couponCode))
        {
            discount = await _promotionService.ValidateCouponAsync(
                couponCode, basket.UserName, subtotal, lines);

            if (discount is { Valid: true })
            {
                summary.AppliedCouponCode = discount.Code;
                summary.Message = discount.Message;
            }
            else
            {
                summary.Message = discount?.Message ?? "Kupon uygulanamadı.";
                discount = null;
            }
        }

        if (discount is null)
        {
            discount = await _promotionService.GetApplicableCampaignAsync(subtotal, lines);
            if (discount is not null) summary.AppliedCampaignName = discount.Name;
        }

        summary.DiscountAmount = discount?.DiscountAmount ?? 0;
        summary.FreeShipping = discount?.FreeShipping ?? false;

        if (carrierId.HasValue)
        {
            var itemCount = basket.Items.Sum(i => i.Quantity);
            var options = await _shippingService.GetQuotesAsync(subtotal, itemCount);
            var selected = options.FirstOrDefault(o => o.CarrierId == carrierId.Value);

            if (selected is not null)
                summary.ShippingCost = summary.FreeShipping ? 0 : selected.Price;
        }

        summary.Total = Math.Max(0, subtotal - summary.DiscountAmount) + summary.ShippingCost;
        return summary;
    }

    [HttpGet("{userName}")]
    public async Task<ActionResult<ShoppingCart>> GetBasket(string userName)
    {
        if (!CallerIdentity.CanAccessBasket(User, userName))
            return Forbid();

        var basket = await _repository.GetBasket(userName);
        return Ok(basket ?? new ShoppingCart(userName));
    }

    [HttpPost]
    public async Task<ActionResult<ShoppingCart>> UpdateBasket([FromBody] ShoppingCart basket)
    {
        if (!CallerIdentity.CanAccessBasket(User, basket.UserName))
            return Forbid();

        // Eğer sepet boşsa (kullanıcı tüm ürünleri silmiş olabilir), direkt boş sepeti kaydet
        if (basket.Items == null || basket.Items.Count == 0)
        {
            _logger.LogInformation("Sepet boş, boş sepet olarak kaydediliyor. UserName: {UserName}", basket.UserName);
            var emptyBasket = new ShoppingCart(basket.UserName);
            return Ok(await _repository.UpdateBasket(emptyBasket));
        }

        // --- GÜVENLİK VE DOĞRULAMA ADIMI BAŞLIYOR ---
        
        var itemsToRemove = new List<ShoppingCartItem>();
        
        // Sepete eklenen her ürün için Catalog API'ye soruyoruz
        foreach (var item in basket.Items)
        {
            if (string.IsNullOrEmpty(item.ProductId))
            {
                // ProductId boşsa bu item'i sepetten çıkar
                itemsToRemove.Add(item);
                _logger.LogWarning("ProductId boş olan item sepetten çıkarıldı. UserName: {UserName}", basket.UserName);
                continue;
            }

            var product = await _catalogService.GetProduct(item.ProductId);
            
            if (product != null)
            {
                // Catalog API'den gelen GERÇEK fiyatı ve ismi kullanıyoruz.
                // Kullanıcı Postman'den 1 TL gönderse bile burası onu ezer.
                var oldPrice = item.Price; // Eski fiyatı kaydet (gönderilen fiyat)
                item.Price = product.Price; // Gerçek fiyatı set et
                item.ProductName = product.Name;
                
                _logger.LogInformation(
                    "Ürün fiyatı güncellendi. ProductId: {ProductId}, Eski Fiyat (gönderilen): {OldPrice}, Yeni Fiyat (gerçek): {NewPrice}", 
                    item.ProductId, oldPrice, product.Price);
            }
            else
            {
                // Ürün Catalog API'de bulunamadı, sepetten çıkar
                itemsToRemove.Add(item);
                _logger.LogWarning(
                    "Catalog API'de bulunamayan ürün sepetten çıkarıldı. ProductId: {ProductId}, UserName: {UserName}", 
                    item.ProductId, basket.UserName);
            }
        }
        
        // Bulunamayan ürünleri sepetten çıkar
        foreach (var item in itemsToRemove)
        {
            basket.Items.Remove(item);
        }

        // Eğer sepet boşsa (kullanıcı tüm ürünleri silmiş olabilir), boş sepeti kaydet
        if (basket.Items.Count == 0)
        {
            _logger.LogInformation("Sepet boş, boş sepet olarak kaydediliyor. UserName: {UserName}", basket.UserName);
            // Boş sepeti kaydet (kullanıcı tekrar ürün eklediğinde sepet hazır olur)
            var emptyBasket = new ShoppingCart(basket.UserName);
            return Ok(await _repository.UpdateBasket(emptyBasket));
        }
        
        // ---------------------------------------------

        return Ok(await _repository.UpdateBasket(basket));
    }

    [HttpDelete("{userName}")]
    public async Task<IActionResult> DeleteBasket(string userName)
    {
        if (!CallerIdentity.CanAccessBasket(User, userName))
            return Forbid();

        await _repository.DeleteBasket(userName);
        return Ok();
    }

    // CHECKOUT İŞLEMİ (Senin yazdığın doğru kod korundu ✅)
    [Route("[action]")]
    [HttpPost]
    public async Task<IActionResult> Checkout([FromBody] BasketCheckout basketCheckout)
    {
        if (!CallerIdentity.CanAccessBasket(User, basketCheckout.UserName))
            return Forbid();

        _logger.LogInformation("Checkout isteği alındı. UserName={UserName}", basketCheckout.UserName);
            
        // 1. Sepeti Getir
        var basket = await _repository.GetBasket(basketCheckout.UserName);
        if (basket == null)
        {
            return BadRequest("Sepet bulunamadı!");
        }

        if (basket.Items == null || basket.Items.Count == 0)
        {
            return BadRequest("Sepetiniz boş! Sipariş oluşturulamaz.");
        }

        // 2. Kupon/kampanya indirimi ve kargo ucretini hesapla
        var summary = await BuildSummary(
            basket, basketCheckout.CouponCode, basketCheckout.ShippingCarrierId);

        _logger.LogInformation(
            "Sepet özeti. AraToplam={Subtotal}, İndirim={Discount}, Kargo={Shipping}, Toplam={Total}",
            summary.Subtotal, summary.DiscountAmount, summary.ShippingCost, summary.Total);

        // 3. Event Mesajını Oluştur
        var eventMessage = new BasketCheckoutEventMessage
        {
            UserName = basketCheckout.UserName,
            TotalPrice = summary.Total,
            Subtotal = summary.Subtotal,
            DiscountAmount = summary.DiscountAmount,
            CouponCode = summary.AppliedCouponCode,
            ShippingCost = summary.ShippingCost,
            ShippingCarrierId = basketCheckout.ShippingCarrierId,
            FirstName = basketCheckout.FirstName,
            LastName = basketCheckout.LastName,
            EmailAddress = basketCheckout.EmailAddress,
            AddressLine = basketCheckout.AddressLine,

            // Kart alanları kasıtlı olarak boş bırakılır (PCI / mock ödeme).
            CardName = string.Empty,
            CardNumber = string.Empty,
            Expiration = string.Empty,
            CVV = string.Empty,

            BasketItems = basket.Items.Select(i => new OrderItemMessage
            {
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                PictureUrl = i.PictureUrl,
                Price = i.Price,
                Quantity = i.Quantity
            }).ToList()
        };

        _logger.LogInformation("Event mesajı oluşturuldu. ItemCount={Count}", eventMessage.BasketItems.Count);

        // 4. Mesajı Fırlat (Fire-and-forget yaklaşımı - hata olsa bile hızlı response dön)
        try
        {
            // Timeout ile publish işlemi (5 saniye)
            using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5)))
            {
                await _publishEndpoint.Publish(eventMessage, cts.Token);
                _logger.LogInformation("Event başarıyla publish edildi.");
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Event publish işlemi zaman aşımına uğradı, ancak işlem devam ediyor.");
        }
        catch (Exception ex)
        {
            // Event publish başarısız olsa bile kullanıcıya hızlı response dön
            // Event daha sonra retry mekanizması ile tekrar denenebilir
            _logger.LogError(ex, "Event publish edilirken hata oluştu, ancak işlem devam ediyor.");
        }

        // 5. Kupon kullanımını kaydet (siparis Id'si henuz yok, kullanici adiyla eslenir)
        if (!string.IsNullOrWhiteSpace(summary.AppliedCouponCode))
        {
            await _promotionService.RedeemAsync(
                summary.AppliedCouponCode, basketCheckout.UserName, null, summary.DiscountAmount);
        }

        // 6. Kargo gönderisi kaydı oluştur
        if (basketCheckout.ShippingCarrierId.HasValue)
        {
            await _shippingService.CreateShipmentAsync(
                $"{basketCheckout.UserName}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                basketCheckout.UserName,
                basketCheckout.ShippingCarrierId,
                summary.ShippingCost,
                $"{basketCheckout.FirstName} {basketCheckout.LastName}".Trim(),
                basketCheckout.AddressLine);
        }

        // 7. Sepeti Temizle (Event publish başarısız olsa bile sepeti temizle)
        try
        {
            await _repository.DeleteBasket(basketCheckout.UserName);
            _logger.LogInformation("Sepet temizlendi.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Sepet temizlenirken hata oluştu.");
        }

        // Hızlı response dön (202 Accepted - işlem asenkron devam ediyor)
        return Accepted();
    }
}