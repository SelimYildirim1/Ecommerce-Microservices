namespace Core.Shared.Events;

// Mesajların "Interface" olması MassTransit'te best-practice'dir.
public interface ProductCreatedEvent
{
    Guid Id { get; set; }
    string Name { get; set; }
    decimal Price { get; set; }
    int StockQuantity { get; set; }
}