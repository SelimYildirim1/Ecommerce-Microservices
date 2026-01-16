using System.Text.Json;
using Basket.API.Entities;
using Microsoft.Extensions.Caching.Distributed;

namespace Basket.API.Repositories;

public class BasketRepository : IBasketRepository
{
    private readonly IDistributedCache _redisCache;

    public BasketRepository(IDistributedCache redisCache)
    {
        _redisCache = redisCache;
    }

    public async Task<ShoppingCart> GetBasket(string userName)
    {
        var basket = await _redisCache.GetStringAsync(userName);

        if (String.IsNullOrEmpty(basket))
            return null;

        return JsonSerializer.Deserialize<ShoppingCart>(basket);
    }

    public async Task<ShoppingCart> UpdateBasket(ShoppingCart basket)
{
    // Ajan 1: Metoda girdi mi?
    Console.WriteLine($"[LOG] UpdateBasket Metodu Çalıştı! Kullanıcı: {basket.UserName}");

    var jsonBasket = JsonSerializer.Serialize(basket);
    
    // Ajan 2: Redis'e yazmadan hemen önce
    Console.WriteLine($"[LOG] Redis'e yazılıyor... Data uzunluğu: {jsonBasket.Length}");

    await _redisCache.SetStringAsync(basket.UserName, jsonBasket);

    // Ajan 3: Yazdıktan sonra
    Console.WriteLine($"[LOG] Redis'e YAZILDI!");

    return await GetBasket(basket.UserName);
}

    public async Task DeleteBasket(string userName)
    {
        await _redisCache.RemoveAsync(userName);
    }
}