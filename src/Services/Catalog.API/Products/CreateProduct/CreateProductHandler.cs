using Catalog.API.Data;
using Catalog.API.Entities;
using MediatR;
using MassTransit;
using Core.Shared.Events;

namespace Catalog.API.Products.CreateProduct;

public class CreateProductHandler : IRequestHandler<CreateProductCommand, Guid>
{
    private readonly CatalogDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;

    public CreateProductHandler(CatalogDbContext context, IPublishEndpoint publishEndpoint)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
    }

    public async Task<Guid> Handle(CreateProductCommand command, CancellationToken cancellationToken)
    {
        var product = new Product
        {
            Name = command.Name,
            Description = command.Description,
            CategoryId = command.CategoryId,
            BrandId = command.BrandId,
            MetaTitle = command.MetaTitle,
            MetaDescription = command.MetaDescription,
            Slug = SlugGenerator.Generate(
                string.IsNullOrWhiteSpace(command.Slug) ? command.Name : command.Slug)
        };

        var images = (command.Images ?? new List<CreateProductImageRequest>())
            .Where(i => !string.IsNullOrWhiteSpace(i.Url))
            .OrderBy(i => i.SortOrder)
            .ToList();

        if (images.Count > 0)
        {
            for (var i = 0; i < images.Count; i++)
            {
                product.Images.Add(new ProductImage
                {
                    ProductId = product.Id,
                    Url = images[i].Url,
                    IsPrimary = images.Any(x => x.IsPrimary) ? images[i].IsPrimary : i == 0,
                    SortOrder = i
                });
            }
        }
        else if (!string.IsNullOrWhiteSpace(command.PrimaryImageUrl))
        {
            product.Images.Add(new ProductImage
            {
                ProductId = product.Id,
                Url = command.PrimaryImageUrl,
                IsPrimary = true,
                SortOrder = 0
            });
        }

        foreach (var v in command.Variants)
        {
            product.Variants.Add(new ProductVariant
            {
                ProductId = product.Id,
                Sku = v.Sku,
                Price = v.Price,
                StockQuantity = v.StockQuantity,
                Specifics = v.Specifics
            });
        }

        _context.Products.Add(product);
        await _context.SaveChangesAsync(cancellationToken);

        var firstVariant = product.Variants.First();
        await _publishEndpoint.Publish<ProductCreatedEvent>(new
        {
            Id = product.Id,
            Name = product.Name,
            Price = firstVariant.Price,
            StockQuantity = firstVariant.StockQuantity
        }, cancellationToken);

        return product.Id;
    }
}
