using Catalog.API.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Products.DeleteProduct;

public class DeleteProductHandler : IRequestHandler<DeleteProductCommand, bool>
{
    private readonly CatalogDbContext _context;

    public DeleteProductHandler(CatalogDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteProductCommand command, CancellationToken cancellationToken)
    {
        var product = await _context.Products
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == command.Id, cancellationToken);

        if (product is null) return false;

        if (command.Permanent)
        {
            _context.Products.Remove(product);
        }
        else
        {
            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;

            foreach (var variant in product.Variants)
            {
                variant.IsActive = false;
                variant.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public class SetProductStatusHandler : IRequestHandler<SetProductStatusCommand, bool>
{
    private readonly CatalogDbContext _context;

    public SetProductStatusHandler(CatalogDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(SetProductStatusCommand command, CancellationToken cancellationToken)
    {
        var product = await _context.Products.FindAsync(new object[] { command.Id }, cancellationToken);
        if (product is null) return false;

        product.IsActive = command.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
