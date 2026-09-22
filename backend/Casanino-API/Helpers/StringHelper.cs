using System.Globalization;
using System.Text;

namespace Casanino_API.Helpers;

public static class StringHelper
{
    public static string RemoveDiacritics(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var normalized = value.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);

        foreach (var c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }

        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    public static string SanitizeFileName(string? value)
    {
        var cleaned = RemoveDiacritics(value);
        var invalid = Path.GetInvalidFileNameChars().ToHashSet();
        var sb = new StringBuilder(cleaned.Length);

        foreach (var c in cleaned)
        {
            sb.Append(char.IsWhiteSpace(c) || invalid.Contains(c) ? '_' : c);
        }

        var output = sb.ToString().Trim('_');
        return string.IsNullOrEmpty(output) ? "imagen" : output;
    }

    public static string Slug(string? value)
    {
        var chars = RemoveDiacritics(value)
            .Trim()
            .ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '_');

        var slug = string.Concat(chars);

        while (slug.Contains("__", StringComparison.Ordinal))
        {
            slug = slug.Replace("__", "_", StringComparison.Ordinal);
        }

        return slug.Trim('_');
    }
}