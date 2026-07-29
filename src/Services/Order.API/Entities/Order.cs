using Order.API.Domain.AggregatesModel.OrderAggregate;

namespace Order.API.Entities;

public class Order : BaseEntity, IAggregateRoot
{
    /// <summary>Veritabaninda "CreatedDate" kolonunda tutulur.</summary>
    public DateTime OrderDate { get; private set; }

    /// <summary>Identity'deki kullanici Id'si. "UserName" kolonunda tutulur.</summary>
    public string BuyerId { get; private set; } = default!;

    // Alici bilgileri (checkout formundan gelir)
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string EmailAddress { get; private set; } = string.Empty;

    // Adres bilgileri (Value Object, Order'ın içinde kolon olarak saklanır)
    public Address Address { get; private set; } = default!;

    public string OrderStatus { get; private set; } = "Submitted"; // Submitted, Paid, Shipped
    public string? Description { get; private set; } // Müşteri notu

    /// <summary>Siparis aninda dondurulan toplam tutar.</summary>
    public decimal TotalPrice { get; private set; }

    // Kupon ve kargo kirilimi (opsiyonel; eski siparislerde 0'dir)
    public decimal DiscountAmount { get; private set; }
    public string? CouponCode { get; private set; }
    public decimal ShippingCost { get; private set; }

    // Sipariş Kalemleri
    private readonly List<OrderItem> _orderItems;
    public IReadOnlyCollection<OrderItem> OrderItems => _orderItems;

    /// <summary>
    /// Toplam tutar. Kayitli deger varsa o kullanilir; yoksa kalemlerden hesaplanir.
    /// </summary>
    public decimal TotalAmount =>
        TotalPrice > 0 ? TotalPrice : _orderItems.Sum(o => o.Units * o.UnitPrice);

    public Order()
    {
        _orderItems = new List<OrderItem>();
    }

    public Order(string buyerId, Address address, string? description) : this()
    {
        BuyerId = buyerId;
        Address = address;
        Description = description;
        OrderStatus = "Submitted";
        OrderDate = DateTime.UtcNow;
    }

    public void SetContact(string firstName, string lastName, string emailAddress)
    {
        FirstName = firstName ?? string.Empty;
        LastName = lastName ?? string.Empty;
        EmailAddress = emailAddress ?? string.Empty;
    }

    public void SetTotals(decimal totalPrice, decimal discountAmount, string? couponCode, decimal shippingCost)
    {
        TotalPrice = totalPrice;
        DiscountAmount = discountAmount;
        CouponCode = couponCode;
        ShippingCost = shippingCost;
    }

    public void AddOrderItem(Guid productId, string productName, decimal unitPrice,
        string? pictureUrl, int units, string? selectedAttributes)
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
