using Order.API.Domain.AggregatesModel.OrderAggregate;

namespace Order.API.Entities;

public class Order : BaseEntity, IAggregateRoot
{
    public DateTime OrderDate { get; private set; }
    public string BuyerId { get; private set; } = default!; // Identity'deki UserID

    // Adres bilgileri (Value Object, Order'ın içinde kolon olarak saklanır)
    public Address Address { get; private set; } = default!;

    public string OrderStatus { get; private set; } = "Submitted"; // Submitted, Paid, Shipped
    public string Description { get; private set; } = default!; // Müşteri notu

    // Sipariş Kalemleri
    private readonly List<OrderItem> _orderItems;
    public IReadOnlyCollection<OrderItem> OrderItems => _orderItems;

    public decimal TotalAmount => _orderItems.Sum(o => o.Units * o.UnitPrice);

    public Order()
    {
        _orderItems = new List<OrderItem>();
    }

    public Order(string buyerId, Address address, string description) : this()
    {
        BuyerId = buyerId;
        Address = address;
        Description = description;
        OrderStatus = "Submitted";
        OrderDate = DateTime.UtcNow;
    }

    public void AddOrderItem(int productId, string productName, decimal unitPrice,
        string pictureUrl, int units, string selectedAttributes)
    {
        var existingOrder = _orderItems.SingleOrDefault(
            o => o.ProductId == productId && o.SelectedAttributes == selectedAttributes);

        if (existingOrder != null)
        {
            existingOrder.AddUnits(units);
        }
        else
        {
            var orderItem = new OrderItem(productId, productName, pictureUrl, unitPrice, units, selectedAttributes);
            _orderItems.Add(orderItem);
        }
    }

    public void SetStatus(string status)
    {
        OrderStatus = status;
    }
}
