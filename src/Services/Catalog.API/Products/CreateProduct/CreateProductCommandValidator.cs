using FluentValidation;

namespace Catalog.API.Products.CreateProduct;

public class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün adı boş olamaz.")
            .Length(2, 150).WithMessage("Ürün adı 2 ile 150 karakter arasında olmalıdır.");

        RuleFor(x => x.CategoryId)
            .NotEmpty().WithMessage("Kategori seçilmelidir.");

        RuleFor(x => x.BrandId)
            .NotEmpty().WithMessage("Marka seçilmelidir.");

        RuleFor(x => x.Variants)
            .NotEmpty().WithMessage("En az bir varyant gereklidir.");

        RuleForEach(x => x.Variants).ChildRules(v =>
        {
            v.RuleFor(x => x.Sku)
                .NotEmpty().WithMessage("SKU boş olamaz.");
            v.RuleFor(x => x.Price)
                .GreaterThan(0).WithMessage("Fiyat 0'dan büyük olmalıdır.");
            v.RuleFor(x => x.StockQuantity)
                .GreaterThanOrEqualTo(0).WithMessage("Stok negatif olamaz.");
        });
    }
}
