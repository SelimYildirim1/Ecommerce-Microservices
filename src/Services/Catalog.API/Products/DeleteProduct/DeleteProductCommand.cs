using MediatR;

namespace Catalog.API.Products.DeleteProduct;

/// <summary>Varsayilan olarak soft delete (IsActive=false) uygular.</summary>
public record DeleteProductCommand(Guid Id, bool Permanent = false) : IRequest<bool>;

/// <summary>Urunun aktif/pasif durumunu degistirir.</summary>
public record SetProductStatusCommand(Guid Id, bool IsActive) : IRequest<bool>;
