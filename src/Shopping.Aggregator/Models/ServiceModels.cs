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
    public List<OrderItemDto> OrderItems { get; set; } = new();
}

public class OrderItemDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public string? PictureUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Units { get; set; }
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
    public string? PrimaryImageUrl { get; set; }
    public bool IsActive { get; set; }
    public List<VariantDto> Variants { get; set; } = new();
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
}
