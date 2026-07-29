using Catalog.API.Data;
using Catalog.API.Entities;
using Catalog.API.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Products.UpdateVariant;

public class UpdateVariantHandler : IRequestHandler<UpdateVariantCommand, bool>
{
    private readonly CatalogDbContext _context;
    private readonly StockLedger _ledger;

    public UpdateVariantHandler(CatalogDbContext context, StockLedger ledger)
    {
        _context = context;
        _ledger = ledger;
    }

    public async Task<bool> Handle(UpdateVariantCommand command, CancellationToken cancellationToken)
    {
        var variant = await _context.ProductVariants
            .FirstOrDefaultAsync(
                v => v.Id == command.VariantId && v.ProductId == command.ProductId,
                cancellationToken);

        if (variant is null) return false;

        if (command.Price.HasValue) variant.Price = command.Price.Value;

        if (command.StockQuantity.HasValue)
        {
            var previousStock = variant.StockQuantity;
            variant.StockQuantity = command.StockQuantity.Value;

            // Stok elle degistiyse sayim duzeltmesi olarak kaydedilir
            if (previousStock != variant.StockQuantity)
            {
                _ledger.Record(
                    variant,
                    StockMovementType.Adjustment,
                    variant.StockQuantity - previousStock,
                    previousStock,
                    note: "Panelden manuel güncelleme",
                    createdBy: "admin");
            }
        }

        if (command.IsActive.HasValue) variant.IsActive = command.IsActive.Value;

        variant.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
