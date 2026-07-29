using Catalog.API.Data;
using Catalog.API.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Catalog.API.Products.UpdateProduct;

public class UpdateProductHandler : IRequestHandler<UpdateProductCommand, bool>
{
    private readonly CatalogDbContext _context;

    public UpdateProductHandler(CatalogDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateProductCommand command, CancellationToken cancellationToken)
    {
        var product = await _context.Products
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == command.Id, cancellationToken);

        if (product is null) return false;

        product.Name = command.Name;
        product.Description = command.Description;
        product.CategoryId = command.CategoryId;
        product.BrandId = command.BrandId;
        // FK degisince eski navigation referansi kalmasin; sonraki okumalar Include ile gelir.
        product.Category = null!;
        product.Brand = null!;
        product.IsActive = command.IsActive;
        product.MetaTitle = command.MetaTitle;
        product.MetaDescription = command.MetaDescription;
        product.Slug = string.IsNullOrWhiteSpace(command.Slug)
            ? SlugGenerator.Generate(command.Name)
            : SlugGenerator.Generate(command.Slug);
        product.UpdatedAt = DateTime.UtcNow;

        SyncVariants(product, command.Variants);
        SyncImages(product, command);

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    /// <summary>
    /// Gonderilmeyen varyantlar silinmez, pasife alinir.
    /// Gecmis siparisler bu varyantlara referans verebilir.
    /// </summary>
    private void SyncVariants(Product product, List<UpdateVariantRequest> incoming)
    {
        var keptIds = incoming.Where(v => v.Id.HasValue).Select(v => v.Id!.Value).ToHashSet();

        foreach (var existing in product.Variants.Where(v => !keptIds.Contains(v.Id)))
        {
            existing.IsActive = false;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        foreach (var item in incoming)
        {
            if (item.Id.HasValue)
            {
                var variant = product.Variants.FirstOrDefault(v => v.Id == item.Id.Value);
                if (variant is null) continue;

                variant.Sku = item.Sku;
                variant.Price = item.Price;
                variant.StockQuantity = item.StockQuantity;
                variant.Specifics = item.Specifics;
                variant.IsActive = item.IsActive;
                variant.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // BaseEntity anahtari istemci tarafinda uretildigi icin navigation'a
                // eklemek EF'e "mevcut kayit" gibi gorunur; DbSet uzerinden eklemek sart.
                _context.ProductVariants.Add(new ProductVariant
                {
                    ProductId = product.Id,
                    Sku = item.Sku,
                    Price = item.Price,
                    StockQuantity = item.StockQuantity,
                    Specifics = item.Specifics,
                    IsActive = item.IsActive
                });
            }
        }
    }

    private void SyncImages(Product product, UpdateProductCommand command)
    {
        // Images gonderilmediyse mevcut gorsellere dokunma; sadece PrimaryImageUrl varsa onu guncelle
        if (command.Images is null)
        {
            if (string.IsNullOrWhiteSpace(command.PrimaryImageUrl)) return;

            var primary = product.Images.FirstOrDefault(i => i.IsPrimary);

            if (primary is null)
            {
                _context.ProductImages.Add(new ProductImage
                {
                    ProductId = product.Id,
                    Url = command.PrimaryImageUrl,
                    IsPrimary = true,
                    SortOrder = 0
                });
            }
            else
            {
                primary.Url = command.PrimaryImageUrl;
                primary.UpdatedAt = DateTime.UtcNow;
            }

            return;
        }

        _context.ProductImages.RemoveRange(product.Images.ToList());

        var images = command.Images
            .Where(i => !string.IsNullOrWhiteSpace(i.Url))
            .OrderBy(i => i.SortOrder)
            .ToList();

        var hasExplicitPrimary = images.Any(x => x.IsPrimary);

        for (var i = 0; i < images.Count; i++)
        {
            _context.ProductImages.Add(new ProductImage
            {
                ProductId = product.Id,
                Url = images[i].Url,
                // Hicbiri isaretlenmemisse ilk gorsel birincil olur
                IsPrimary = hasExplicitPrimary ? images[i].IsPrimary : i == 0,
                SortOrder = i
            });
        }
    }
}
