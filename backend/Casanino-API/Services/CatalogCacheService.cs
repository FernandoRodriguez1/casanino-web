using Casanino_API.DTOs;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;

namespace Casanino_API.Services;

public class CatalogCacheService
{
    private const string SnapshotKey = "catalogo:productos";

    private static readonly TimeSpan SnapshotTtl = TimeSpan.FromSeconds(60);

    // Evita que un ETag emitido antes de un redeploy coincida con uno posterior.
    private static readonly string InstanceId = Guid.NewGuid().ToString("N")[..8];

    private readonly IMemoryCache _cache;
    private long _version;

    public CatalogCacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public long Version => Interlocked.Read(ref _version);

    public string ETag => $"\"cat-{InstanceId}-{Version}\"";

    public void Invalidate()
    {
        Interlocked.Increment(ref _version);
        _cache.Remove(SnapshotKey);
    }

    public bool TryGetSnapshot(out List<ProductoResponse> productos)
    {
        if (_cache.TryGetValue(SnapshotKey, out List<ProductoResponse>? cached) && cached is not null)
        {
            productos = cached;
            return true;
        }

        productos = [];
        return false;
    }

    public void SetSnapshot(List<ProductoResponse> productos)
    {
        _cache.Set(SnapshotKey, productos, SnapshotTtl);
    }

    public bool MatchesIfNoneMatch(StringValues ifNoneMatch)
    {
        if (StringValues.IsNullOrEmpty(ifNoneMatch))
        {
            return false;
        }

        var current = ETag;

        foreach (var header in ifNoneMatch)
        {
            if (string.IsNullOrWhiteSpace(header))
            {
                continue;
            }

            foreach (var candidate in header.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (candidate == "*")
                {
                    return true;
                }

                var normalized = candidate.StartsWith("W/", StringComparison.OrdinalIgnoreCase) ? candidate[2..] : candidate;

                if (string.Equals(normalized, current, StringComparison.Ordinal))
                {
                    return true;
                }
            }
        }

        return false;
    }
}
