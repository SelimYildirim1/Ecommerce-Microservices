using FluentValidation;

namespace Catalog.API.Products.UpdateProduct;

public class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty().WithMessage("Ürün ID zorunludur.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün adı zorunludur.")
            .MaximumLength(150).WithMessage("Ürün adı en fazla 150 karakter olabilir.");

        RuleFor(x => x.Description).NotEmpty().WithMessage("Açıklama zorunludur.");
        RuleFor(x => x.CategoryId).NotEmpty().WithMessage("Kategori seçilmelidir.");
        RuleFor(x => x.BrandId).NotEmpty().WithMessage("Marka seçilmelidir.");

        RuleFor(x => x.Variants)
            .NotEmpty().WithMessage("En az bir varyant gereklidir.");

        RuleForEach(x => x.Variants).ChildRules(v =>
        {
            v.RuleFor(x => x.Sku).NotEmpty().WithMessage("SKU zorunludur.");
            v.RuleFor(x => x.Price).GreaterThan(0).WithMessage("Fiyat 0'dan büyük olmalıdır.");
            v.RuleFor(x => x.StockQuantity).GreaterThanOrEqualTo(0).WithMessage("Stok negatif olamaz.");
        });
    }
}
