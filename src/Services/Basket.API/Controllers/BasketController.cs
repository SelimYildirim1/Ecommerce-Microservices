using Basket.API.Entities;
using Basket.API.Repositories;
using Core.Shared.Events; // Artık referans verdiğimiz için bunu tanıyacak
using MassTransit;        // RabbitMQ postacısı
using Microsoft.AspNetCore.Mvc;

namespace Basket.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class BasketController : ControllerBase
{
    private readonly IBasketRepository _repository;
    private readonly IPublishEndpoint _publishEndpoint; // <-- EKSİK OLAN BUYDU

    // Constructor'da (Yapıcı Metot) Postacıyı istiyoruz (Dependency Injection)
    public BasketController(IBasketRepository repository, IPublishEndpoint publishEndpoint)
    {
        _repository = repository;
        _publishEndpoint = publishEndpoint; // <-- VE BURADA EŞLİYORUZ
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
        return Ok(await _repository.UpdateBasket(basket));
    }

    [HttpDelete("{userName}")]
    public async Task<IActionResult> DeleteBasket(string userName)
    {
        await _repository.DeleteBasket(userName);
        return Ok();
    }

    // CHECKOUT İŞLEMİ
    [Route("[action]")]
    [HttpPost]
    public async Task<IActionResult> Checkout([FromBody] BasketCheckout basketCheckout)
    {
        // 1. Sepeti Getir
        var basket = await _repository.GetBasket(basketCheckout.UserName);
        if (basket == null)
        {
            return BadRequest("Sepet bulunamadı!");
        }

        // 2. Event Mesajını Oluştur
        // (RabbitMQ'ya gidecek olan veri paketi)
        var eventMessage = new 
        {
            UserName = basketCheckout.UserName,
            TotalPrice = basket.TotalPrice,
            FirstName = basketCheckout.FirstName,
            LastName = basketCheckout.LastName,
            EmailAddress = basketCheckout.EmailAddress,
            AddressLine = basketCheckout.AddressLine
        };

        // 3. Mesajı Fırlat
        await _publishEndpoint.Publish<BasketCheckoutEvent>(eventMessage);

        // 4. Sepeti Temizle
        await _repository.DeleteBasket(basketCheckout.UserName);

        return Accepted();
    }
}