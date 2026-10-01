namespace Order.API.Services.IntegraOps;

public class IntegraOpsOptions
{
    public const string SectionName = "IntegraOps";

    /// <summary>Kapaliyken olay kuyruga bile yazilmaz; gecmis siparisler sonradan toplu gonderilmez.</summary>
    public bool Enabled { get; set; }

    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string Flow { get; set; } = "ecommerce-order";

    /// <summary>Bu tutar ve uzerindeki siparisler "vip" grubuna girer. 0 ise vip grubu kullanilmaz.</summary>
    public decimal VipMinTotal { get; set; }

    /// <summary>Olaylar kuyruga yazilir ama gonderilmez (toplu kesinti denemesi icin).</summary>
    public bool SendingPaused { get; set; }

    /// <summary>Siparis notundaki #sim: etiketlerini isler. Yalnizca demo ortaminda acilir.</summary>
    public bool SimulationEnabled { get; set; }

    public bool IsConfigured =>
        Enabled && !string.IsNullOrWhiteSpace(BaseUrl) && !string.IsNullOrWhiteSpace(ApiKey);
}
