using Catalog.API.Data;
using Catalog.API.Entities;
using MediatR;
using MassTransit;       // MassTransit kütüphanesi
using Core.Shared.Events; // Bizim oluşturduğumuz Event Interface'i

namespace Catalog.API.Products.CreateProduct;

public class CreateProductHandler : IRequestHandler<CreateProductCommand, Guid>
{
    private readonly CatalogDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint; // Postacımız (RabbitMQ)

    // Constructor (Dependency Injection)
    public CreateProductHandler(CatalogDbContext context, IPublishEndpoint publishEndpoint)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
    }

    public async Task<Guid> Handle(CreateProductCommand command, CancellationToken cancellationToken)
    {
        // 1. Gelen emri Veritabanı nesnesine dönüştür
        // (Burada ... yok, gerçek atamalar var)
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = command.Name,
            Description = command.Description,
            Price = command.Price,
            PictureUrl = command.PictureUrl,
            StockQuantity = command.StockQuantity
        };

        // 2. Veritabanına ekle
        _context.Products.Add(product);
        await _context.SaveChangesAsync(cancellationToken);

        // 3. RabbitMQ'ya Mesaj Fırlat (Publish)
        // Sepet servisi, Stok servisi ileride bunu duyacak.
        await _publishEndpoint.Publish<ProductCreatedEvent>(new 
        {
            Id = product.Id,
            Name = product.Name,
            Price = product.Price,
            StockQuantity = product.StockQuantity
        }, cancellationToken);

        // 4. ID'yi geri dön
        return product.Id;
    }
}