using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Controllers;

/// <summary>
/// Favori listesi. Sepette oldugu gibi kullanici kimligi route uzerinden tasinir.
/// </summary>
[Route("api/favorites")]
[ApiController]
public class FavoritesController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public FavoritesController(CatalogDbContext context)
    {
        _context = context;
    }

    [HttpGet("{userId}")]
    public async Task<ActionResult<List<FavoriteDto>>> GetFavorites(string userId)
    {
        var favorites = await _context.Favorites
            .AsNoTracking()
            .Include(f => f.Product).ThenInclude(p => p.Images)
            .Include(f => f.Product).ThenInclude(p => p.Variants)
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        var result = favorites.Select(f => new FavoriteDto(
            f.Id,
            f.ProductId,
            f.Product?.Name ?? string.Empty,
            f.Product?.Images.FirstOrDefault(i => i.IsPrimary)?.Url
                ?? f.Product?.Images.FirstOrDefault()?.Url,
            f.Product?.Variants.Where(v => v.IsActive).Select(v => v.Price).FirstOrDefault() ?? 0m,
            f.Product?.IsActive ?? false,
            f.CreatedAt)).ToList();

        return Ok(result);
    }

    /// <summary>Yalnizca urun id listesi. Kart ikonlarini isaretlemek icin hafif uc.</summary>
    [HttpGet("{userId}/ids")]
    public async Task<ActionResult<List<Guid>>> GetFavoriteIds(string userId)
    {
        var ids = await _context.Favorites
            .AsNoTracking()
            .Where(f => f.UserId == userId)
            .Select(f => f.ProductId)
            .ToListAsync();

        return Ok(ids);
    }

    /// <summary>Favoriye ekler; zaten varsa cikarir. Sonucta guncel durumu doner.</summary>
    [HttpPost("{userId}/toggle")]
    public async Task<ActionResult<object>> Toggle(string userId, [FromBody] ToggleFavoriteRequest request)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest("Kullanıcı bilgisi gerekli.");

        var productExists = await _context.Products.AnyAsync(p => p.Id == request.ProductId);
        if (!productExists) return NotFound("Ürün bulunamadı.");

        var existing = await _context.Favorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.ProductId == request.ProductId);

        if (existing is not null)
        {
            _context.Favorites.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(new { productId = request.ProductId, isFavorite = false });
        }

        _context.Favorites.Add(new Favorite
        {
            UserId = userId,
            ProductId = request.ProductId
        });

        await _context.SaveChangesAsync();

        return Ok(new { productId = request.ProductId, isFavorite = true });
    }

    [HttpDelete("{userId}/{productId:guid}")]
    public async Task<IActionResult> Remove(string userId, Guid productId)
    {
        var favorite = await _context.Favorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.ProductId == productId);

        if (favorite is null) return NotFound();

        _context.Favorites.Remove(favorite);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
