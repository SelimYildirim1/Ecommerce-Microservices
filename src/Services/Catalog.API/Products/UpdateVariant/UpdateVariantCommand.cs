using MediatR;

namespace Catalog.API.Products.UpdateVariant;

/// <summary>
/// Tek varyantin fiyat/stok/durum guncellemesi.
/// Null gonderilen alanlar degistirilmez; hizli stok duzeltmesi icin kullanilir.
/// </summary>
public record UpdateVariantCommand(
    Guid ProductId,
    Guid VariantId,
    decimal? Price = null,
    int? StockQuantity = null,
    bool? IsActive = null) : IRequest<bool>;
