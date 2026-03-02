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
            BrandId = command.BrandId
        };

        if (!string.IsNullOrWhiteSpace(command.PrimaryImageUrl))
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
