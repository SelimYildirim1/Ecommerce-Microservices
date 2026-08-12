using System.Text.Json;

namespace Shopping.Aggregator.Models;

// Order API'den gelen modeller
public class OrderDto
{
    public Guid Id { get; set; }
    public string BuyerId { get; set; } = default!;
    public decimal TotalAmount { get; set; }
    public string OrderStatus { get; set; } = default!;
    public DateTime OrderDate { get; set; }
    public string? Description { get; set; }
    public string? AdminNote { get; set; }
    public string? OrderNumber { get; set; }
    public string? TrackingNumber { get; set; }

    // Alici ve kirilim bilgileri (Order.API yeni alanlar; eski siparislerde bos/0)
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? EmailAddress { get; set; }
    public string? AddressLine { get; set; }
    public string? City { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? CouponCode { get; set; }
    public decimal ShippingCost { get; set; }
    public string? PaymentMethod { get; set; }

    public List<OrderItemDto> OrderItems { get; set; } = new();
}

public class OrderItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public string? PictureUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Units { get; set; }
    public string? SelectedAttributes { get; set; }
}

// Catalog API'den gelen modeller
public class ProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
}

// Catalog API - Detaylı ürün modeli
public class ProductDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string Description { get; set; } = default!;
    public string CategoryName { get; set; } = default!;
    public string BrandName { get; set; } = default!;
    public Guid? CategoryId { get; set; }
    public Guid? BrandId { get; set; }
    public string? PrimaryImageUrl { get; set; }
    public bool IsActive { get; set; }
    public string? Slug { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public List<VariantDto> Variants { get; set; } = new();
    public List<ProductImageDto> Images { get; set; } = new();
}

public class ProductImageDto
{
    public Guid Id { get; set; }
    public string Url { get; set; } = default!;
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
}

public class VariantDto
{
    public Guid Id { get; set; }
    public string Sku { get; set; } = default!;
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public JsonDocument? Specifics { get; set; }
    public bool IsActive { get; set; }
}

// Catalog API - Kategori modelleri
public class CategoryTreeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid? ParentId { get; set; }
    public int AttributeCount { get; set; }
    public List<CategoryTreeDto> Children { get; set; } = new();
}

public class CategoryDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public Guid? ParentId { get; set; }
    public List<CategoryAttributeDto> Attributes { get; set; } = new();
}

public class CategoryAttributeDto
{
    public Guid Id { get; set; }
    public Guid AttributeId { get; set; }
    public string AttributeName { get; set; } = default!;
    public string AttributeCode { get; set; } = default!;
    public string DataType { get; set; } = default!;
    public string? Options { get; set; }
    public bool IsRequired { get; set; }
    public bool IsVariant { get; set; }
    public bool IsFilterable { get; set; }
    public int SortOrder { get; set; }
}

// Catalog API - Attribute modeli
public class AttributeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string Code { get; set; } = default!;
    public string DataType { get; set; } = default!;
    public string? Options { get; set; }
    public bool IsRequired { get; set; }
    public bool IsVariant { get; set; }
}

// Catalog API - Brand modeli
public class BrandDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? LogoUrl { get; set; }
}

// Identity API'den gelen modeller
public class UserDto
{
    public string Id { get; set; } = default!;
    public string UserName { get; set; } = default!;
    public string Email { get; set; } = default!;

    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsBlocked { get; set; }
    public List<string> Roles { get; set; } = new();
    public int AddressCount { get; set; }
}
