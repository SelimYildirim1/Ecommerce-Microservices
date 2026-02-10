using Basket.API.Entities;
using Basket.API.Repositories;
using Basket.API.Services; // <-- YENİ: CatalogService'i kullanabilmek için ekledik
using Core.Shared.Events; 
using MassTransit;        
using Microsoft.AspNetCore.Mvc;

namespace Basket.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class BasketController : ControllerBase
{
    private readonly IBasketRepository _repository;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<BasketController> _logger;
    private readonly CatalogService _catalogService; // <-- 1. YENİ: Servisi tanımladık

    // Constructor'da CatalogService'i de istiyoruz (Dependency Injection)
    public BasketController(
        IBasketRepository repository, 
        IPublishEndpoint publishEndpoint,
        ILogger<BasketController> logger,
        CatalogService catalogService) // <-- 2. YENİ: Parametre olarak ekledik
    {
        _repository = repository;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
        _catalogService = catalogService; // <-- 3. YENİ: Atama yaptık
    }

    [HttpGet("{userName}")]
    public async Task<ActionResult<ShoppingCart>> GetBasket(string userName)
    {
        var basket = await _repository.GetBasket(userName);
        return Ok(basket ?? new ShoppingCart(userName));
    }

    [HttpPost]
    public async Task<ActionResult<ShoppingCart>> UpdateBasket([FromBody] ShoppingCart basket)
    {
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
        await _repository.DeleteBasket(userName);
        return Ok();
    }

    // CHECKOUT İŞLEMİ (Senin yazdığın doğru kod korundu ✅)
    [Route("[action]")]
    [HttpPost]
    public async Task<IActionResult> Checkout([FromBody] BasketCheckout basketCheckout)
    {
        _logger.LogInformation("Checkout isteği alındı. UserName={UserName}, CardName={CardName}", 
            basketCheckout.UserName, basketCheckout.CardName);
            
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

        // 2. Event Mesajını Oluştur
        var eventMessage = new BasketCheckoutEventMessage
        {
            UserName = basketCheckout.UserName,
            TotalPrice = basket.TotalPrice,
            FirstName = basketCheckout.FirstName,
            LastName = basketCheckout.LastName,
            EmailAddress = basketCheckout.EmailAddress,
            AddressLine = basketCheckout.AddressLine,

            CardName = basketCheckout.CardName,
            CardNumber = basketCheckout.CardNumber,
            Expiration = basketCheckout.Expiration,
            CVV = basketCheckout.CVV,

            BasketItems = basket.Items.Select(i => new OrderItemMessage
            {
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                PictureUrl = null,
                Price = i.Price,
                Quantity = i.Quantity
            }).ToList()
        };

        _logger.LogInformation("Event mesajı oluşturuldu. CardName={CardName}, ItemCount={Count}", eventMessage.CardName, eventMessage.BasketItems.Count);

        // 3. Mesajı Fırlat (Fire-and-forget yaklaşımı - hata olsa bile hızlı response dön)
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

        // 4. Sepeti Temizle (Event publish başarısız olsa bile sepeti temizle)
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