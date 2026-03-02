using MediatR;

namespace Catalog.API.Categories.GetCategoryFilters;

/// <summary>
/// Bir kategorinin filtrelenebilir özelliklerini ve her özelliğin
/// o kategorideki ürünlerde bulunan değerlerini döner.
/// </summary>
public record GetCategoryFiltersQuery(Guid CategoryId) : IRequest<CategoryFiltersDto?>;

public record CategoryFiltersDto(
    Guid CategoryId,
    string CategoryName,
    List<FilterAttributeDto> Filters);

public record FilterAttributeDto(
    Guid AttributeId,
    string Name,
    string Code,
    string DataType,
    /// <summary>Tanımlı seçenekler (Select tipinde)</summary>
    List<string>? Options,
    /// <summary>Bu kategorideki ürünlerin Specifics JSONB'sinden çıkarılan gerçek değerler</summary>
    List<string> AvailableValues);
