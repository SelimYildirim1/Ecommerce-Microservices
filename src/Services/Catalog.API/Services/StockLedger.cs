using Catalog.API.Data;
using Catalog.API.Entities;

namespace Catalog.API.Services;

/// <summary>
/// Stok hareketlerini tek noktadan yazar. Cagiran taraf varyantin stok
/// alanini gunceller, burasi yalnizca gecmis kaydini olusturur; boylece
/// mevcut stok mantiginin davranisi degismez.
/// </summary>
public class StockLedger
{
    private readonly CatalogDbContext _context;

    public StockLedger(CatalogDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Hareketi kaydeder. SaveChanges cagirmaz; cagiran taraf kendi
    /// islemiyle birlikte tek transaction'da yazar.
    /// </summary>
    public StockMovement Record(
        ProductVariant variant,
        StockMovementType type,
        int quantity,
        int previousStock,
        string? reference = null,
        string? note = null,
        string createdBy = "system")
    {
        var movement = new StockMovement
        {
            ProductVariantId = variant.Id,
            ProductId = variant.ProductId,
            Type = type,
            Quantity = quantity,
            PreviousStock = previousStock,
            NewStock = variant.StockQuantity,
            Reference = reference,
            Note = note,
            CreatedBy = createdBy
        };

        _context.StockMovements.Add(movement);
        return movement;
    }
}
