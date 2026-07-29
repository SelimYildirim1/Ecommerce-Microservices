using System.Text;
using System.Text.RegularExpressions;

namespace Catalog.API.Products;

/// <summary>Turkce karakterleri de ceviren URL slug uretici.</summary>
public static class SlugGenerator
{
    private static readonly Dictionary<char, char> TurkishMap = new()
    {
        ['ç'] = 'c', ['Ç'] = 'c',
        ['ğ'] = 'g', ['Ğ'] = 'g',
        ['ı'] = 'i', ['I'] = 'i', ['İ'] = 'i',
        ['ö'] = 'o', ['Ö'] = 'o',
        ['ş'] = 's', ['Ş'] = 's',
        ['ü'] = 'u', ['Ü'] = 'u'
    };

    public static string Generate(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        var sb = new StringBuilder(input.Length);

        foreach (var ch in input)
            sb.Append(TurkishMap.TryGetValue(ch, out var mapped) ? mapped : char.ToLowerInvariant(ch));

        var slug = Regex.Replace(sb.ToString(), @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"[\s-]+", "-").Trim('-');

        return slug;
    }
}
