using System.Text.RegularExpressions;

namespace Order.API.Services.IntegraOps;

/// <summary>
/// Siparis notundaki deneme etiketleri. IntegraOps tarafinda eksik adim, hata,
/// gecikme ve grup senaryolarini gercek siparis uzerinden uretmek icin kullanilir:
///   #sim:drop=invoice-created          adim hic bildirilmez
///   #sim:fail=payment-completed        adim "failed" olarak bildirilir
///   #sim:delay=shipped:1200            adim 1200 saniye gec gerceklesmis gibi bildirilir
///   #sim:group=vip                     grup elle secilir (vip | export)
/// </summary>
public class IntegraOpsSimulation
{
    private static readonly Regex TagPattern = new(
        @"#sim:(?<kind>drop|fail|delay|group)=(?<value>[a-z][a-z-]*)(?::(?<seconds>\d{1,6}))?",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);

    public static readonly IntegraOpsSimulation None = new();

    private readonly HashSet<string> _dropped = new(StringComparer.OrdinalIgnoreCase);
    private readonly HashSet<string> _failed = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, int> _delays = new(StringComparer.OrdinalIgnoreCase);

    public string? Group { get; private set; }

    public bool IsDropped(string step) => _dropped.Contains(step);
    public bool IsFailed(string step) => _failed.Contains(step);
    public TimeSpan DelayFor(string step) =>
        _delays.TryGetValue(step, out var seconds) ? TimeSpan.FromSeconds(seconds) : TimeSpan.Zero;

    public static IntegraOpsSimulation Parse(string? orderNote)
    {
        if (string.IsNullOrWhiteSpace(orderNote) || !orderNote.Contains("#sim:", StringComparison.OrdinalIgnoreCase))
            return None;

        var simulation = new IntegraOpsSimulation();
        foreach (Match match in TagPattern.Matches(orderNote))
        {
            var value = match.Groups["value"].Value.ToLowerInvariant();
            switch (match.Groups["kind"].Value.ToLowerInvariant())
            {
                case "drop":
                    simulation._dropped.Add(value);
                    break;
                case "fail":
                    simulation._failed.Add(value);
                    break;
                case "delay" when match.Groups["seconds"].Success:
                    simulation._delays[value] = int.Parse(match.Groups["seconds"].Value);
                    break;
                case "group":
                    simulation.Group = value;
                    break;
            }
        }

        return simulation;
    }
}
