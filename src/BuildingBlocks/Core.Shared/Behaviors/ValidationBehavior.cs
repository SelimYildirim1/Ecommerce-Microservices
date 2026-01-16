using FluentValidation;
using MediatR;

namespace Core.Shared.Behaviors;

public class ValidationBehavior<TRequest, TResponse> 
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        // 1. Bu istek için yazılmış bir Validator var mı?
        if (!_validators.Any())
        {
            return await next(); // Yoksa devam et
        }

        // 2. Varsa doğrulama bağlamını oluştur
        var context = new ValidationContext<TRequest>(request);

        // 3. Tüm kuralları çalıştır
        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        // 4. Hataları topla
        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        // 5. Hata varsa "DUR!" ve hata fırlat (Handler çalışmaz)
        if (failures.Any())
        {
            throw new ValidationException(failures);
        }

        // 6. Sorun yoksa yola devam et
        return await next();
    }
}