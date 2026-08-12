namespace Catalog.API.Helpers;

/// <summary>Türkçe karakterleri sadeleştirerek URL slug üretir.</summary>
public static class SlugHelper
{
    public static string Slugify(string? slug, string title)
    {
        var source = string.IsNullOrWhiteSpace(slug) ? title : slug;

        var replacements = new Dictionary<char, char>
        {
            ['ı'] = 'i', ['İ'] = 'i', ['ğ'] = 'g', ['Ğ'] = 'g',
            ['ü'] = 'u', ['Ü'] = 'u', ['ş'] = 's', ['Ş'] = 's',
            ['ö'] = 'o', ['Ö'] = 'o', ['ç'] = 'c', ['Ç'] = 'c'
        };

        var builder = new System.Text.StringBuilder();

        foreach (var c in source.Trim().ToLowerInvariant())
        {
            var mapped = replacements.TryGetValue(c, out var r) ? r : c;

            if (char.IsLetterOrDigit(mapped)) builder.Append(mapped);
            else if (mapped is ' ' or '-' or '_') builder.Append('-');
        }

        return builder.ToString().Trim('-');
    }
}
