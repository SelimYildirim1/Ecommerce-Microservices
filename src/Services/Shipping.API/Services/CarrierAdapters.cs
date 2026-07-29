namespace Shipping.API.Services;

/// <summary>
/// Kargo firmasi entegrasyonu. Gercek entegrasyon gelene kadar mock adaptorler kullanilir;
/// arayuz aynen korunarak gercek istemcilerle degistirilebilir.
/// </summary>
public interface ICarrierAdapter
{
    string Code { get; }

    /// <summary>Gonderi olusturur ve takip numarasi doner.</summary>
    Task<string> CreateShipmentAsync(string orderId, string? recipientName, string? city);
}

public abstract class MockCarrierAdapter : ICarrierAdapter
{
    public abstract string Code { get; }
    protected abstract string Prefix { get; }

    public Task<string> CreateShipmentAsync(string orderId, string? recipientName, string? city)
    {
        var suffix = Guid.NewGuid().ToString("N")[..10].ToUpperInvariant();
        return Task.FromResult($"{Prefix}{suffix}");
    }
}

public class ArasAdapter : MockCarrierAdapter
{
    public override string Code => "aras";
    protected override string Prefix => "ARS";
}

public class YurticiAdapter : MockCarrierAdapter
{
    public override string Code => "yurtici";
    protected override string Prefix => "YK";
}

public class MngAdapter : MockCarrierAdapter
{
    public override string Code => "mng";
    protected override string Prefix => "MNG";
}

public class PttAdapter : MockCarrierAdapter
{
    public override string Code => "ptt";
    protected override string Prefix => "PTT";
}

/// <summary>Kod'a gore dogru adaptoru bulur; bilinmeyen kodlarda genel bir numara uretir.</summary>
public class CarrierAdapterFactory
{
    private readonly Dictionary<string, ICarrierAdapter> _adapters;

    public CarrierAdapterFactory(IEnumerable<ICarrierAdapter> adapters)
    {
        _adapters = adapters.ToDictionary(a => a.Code, StringComparer.OrdinalIgnoreCase);
    }

    public ICarrierAdapter Resolve(string? code)
    {
        if (!string.IsNullOrWhiteSpace(code) && _adapters.TryGetValue(code, out var adapter))
            return adapter;

        return new GenericAdapter();
    }

    private sealed class GenericAdapter : MockCarrierAdapter
    {
        public override string Code => "generic";
        protected override string Prefix => "TRK";
    }
}
