using Order.API.Domain.AggregatesModel.OrderAggregate;

namespace Order.API.Entities;

public class Order : BaseEntity, IAggregateRoot
{
    /// <summary>Veritabaninda "CreatedDate" kolonunda tutulur.</summary>
    public DateTime OrderDate { get; private set; }

    /// <summary>Identity'deki kullanici Id'si. "UserName" kolonunda tutulur.</summary>
    public string BuyerId { get; private set; } = default!;

    /// <summary>Insan okunabilir siparis no (YS-yyMMdd-XXXX). Eski kayitlarda null olabilir.</summary>
    public string? OrderNumber { get; private set; }

    public string? TrackingNumber { get; private set; }

    // Alici bilgileri (checkout formundan gelir)
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string EmailAddress { get; private set; } = string.Empty;

    // Adres bilgileri (Value Object, Order'ın içinde kolon olarak saklanır)
    public Address Address { get; private set; } = default!;

    public string OrderStatus { get; private set; } = "Submitted"; // Submitted, Paid, Shipped
    public string? Description { get; private set; } // Müşteri notu

    /// <summary>Admin paneli iç notu (müşteriye gösterilmez).</summary>
    public string? AdminNote { get; private set; }

    /// <summary>Siparis aninda dondurulan toplam tutar.</summary>
    public decimal TotalPrice { get; private set; }

    // Kupon ve kargo kirilimi (opsiyonel; eski siparislerde 0'dir)
    public decimal DiscountAmount { get; private set; }
    public string? CouponCode { get; private set; }
    public decimal ShippingCost { get; private set; }

    // Fatura bilgileri (opsiyonel; geriye donuk uyumlu)
    public string? InvoiceType { get; private set; } // individual | corporate
    public string? TaxId { get; private set; }
    public string? TaxOffice { get; private set; }
    public string? CompanyName { get; private set; }

    // Fatura adresi (gonderim ile ayni degilse)
    public bool BillingSameAsShipping { get; private set; } = true;
    public string? BillingAddressLine { get; private set; }
    public string? BillingCity { get; private set; }
    public string? BillingState { get; private set; }
    public string? BillingCountry { get; private set; }
    public string? BillingZipCode { get; private set; }

    /// <summary>card | bank_transfer | cash_on_delivery</summary>
    public string? PaymentMethod { get; private set; } = "card";

    public bool GiftWrap { get; private set; }
    public string? GiftMessage { get; private set; }

    // Sipariş Kalemleri
    private readonly List<OrderItem> _orderItems;
    public IReadOnlyCollection<OrderItem> OrderItems => _orderItems;

    private readonly List<OrderStatusHistory> _statusHistory = new();
    public IReadOnlyCollection<OrderStatusHistory> StatusHistory => _statusHistory;

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
        BillingSameAsShipping = true;
        PaymentMethod = "card";
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

    public void SetOrderNumber(string orderNumber)
    {
        if (string.IsNullOrWhiteSpace(orderNumber))
            throw new ArgumentException("OrderNumber boş olamaz.", nameof(orderNumber));
        OrderNumber = orderNumber.Trim();
    }

    public void SetTrackingNumber(string? trackingNumber)
    {
        TrackingNumber = string.IsNullOrWhiteSpace(trackingNumber) ? null : trackingNumber.Trim();
    }

    public void SetInvoice(string? invoiceType, string? taxId, string? taxOffice, string? companyName)
    {
        InvoiceType = string.IsNullOrWhiteSpace(invoiceType) ? null : invoiceType.Trim();
        TaxId = string.IsNullOrWhiteSpace(taxId) ? null : taxId.Trim();
        TaxOffice = string.IsNullOrWhiteSpace(taxOffice) ? null : taxOffice.Trim();
        CompanyName = string.IsNullOrWhiteSpace(companyName) ? null : companyName.Trim();
    }

    public void SetPaymentMethod(string? paymentMethod)
    {
        PaymentMethod = string.IsNullOrWhiteSpace(paymentMethod) ? "card" : paymentMethod.Trim();
    }

    public void SetBillingAddress(
        bool sameAsShipping,
        string? addressLine = null,
        string? city = null,
        string? state = null,
        string? country = null,
        string? zipCode = null)
    {
        BillingSameAsShipping = sameAsShipping;
        if (sameAsShipping)
        {
            BillingAddressLine = null;
            BillingCity = null;
            BillingState = null;
            BillingCountry = null;
            BillingZipCode = null;
            return;
        }

        BillingAddressLine = addressLine;
        BillingCity = city;
        BillingState = state;
        BillingCountry = country;
        BillingZipCode = zipCode;
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

    public void SetGiftOptions(bool giftWrap, string? giftMessage)
    {
        GiftWrap = giftWrap;
        GiftMessage = string.IsNullOrWhiteSpace(giftMessage) ? null : giftMessage.Trim();
    }

    public void SetAdminNote(string? adminNote)
    {
        AdminNote = string.IsNullOrWhiteSpace(adminNote) ? null : adminNote.Trim();
    }

    public void SetStatus(string status)
    {
        OrderStatus = status;
    }

    public void AddStatusHistory(string status, string? note = null)
    {
        _statusHistory.Add(new OrderStatusHistory
        {
            Id = Guid.NewGuid(),
            OrderId = Id,
            Status = status,
            Note = note,
            CreatedAt = DateTime.UtcNow
        });
    }
}
