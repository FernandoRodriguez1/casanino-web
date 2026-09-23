using Amazon.S3;
using Amazon.S3.Model;
using Casanino_API.Config;
using Casanino_API.Helpers;
using Microsoft.AspNetCore.Http;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Casanino_API.Services;

public class ImagenR2Service
{
    public const long MaxFileSize = 10 * 1024 * 1024;

    private readonly IAmazonS3 _s3;
    private readonly CloudflareR2Options _options;

    public ImagenR2Service(IAmazonS3 s3, CloudflareR2Options options)
    {
        _s3 = s3;
        _options = options;
    }

    public string BuildPublicUrl(string key) =>
        $"{_options.PublicUrl.TrimEnd('/')}/{key}";

    public string ExtractKey(string storedValue)
    {
        if (storedValue.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || storedValue.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return new Uri(storedValue).AbsolutePath.TrimStart('/');
        }

        return storedValue.TrimStart('/');
    }

    public Task<string> UploadProductoAsync(IFormFile file, string codigo, string nombre, CancellationToken ct = default)
    {
        var safeFileName = StringHelper.SanitizeFileName(file.FileName);
        var safeCodigo = StringHelper.RemoveDiacritics(codigo).Trim().ToLowerInvariant();
        var slug = StringHelper.Slug(nombre);

        if (string.IsNullOrEmpty(slug))
        {
            slug = StringHelper.Slug(safeFileName);
        }

        return UploadAsync(file, $"productos/{safeCodigo}_{slug}.webp", ct);
    }

    public Task<string> UploadCategoriaAsync(IFormFile file, string nombre, CancellationToken ct = default)
    {
        var safeFileName = StringHelper.SanitizeFileName(file.FileName);
        var slug = StringHelper.Slug(nombre);

        if (string.IsNullOrEmpty(slug))
        {
            slug = StringHelper.Slug(safeFileName);
        }

        return UploadAsync(file, $"categoria/{slug}.webp", ct);
    }

    public Task DeleteAsync(string key, CancellationToken ct = default) =>
        _s3.DeleteObjectAsync(_options.BucketName, key, ct);

    private async Task<string> UploadAsync(IFormFile file, string key, CancellationToken ct)
    {
        using var input = new MemoryStream();
        await file.CopyToAsync(input, ct);
        input.Position = 0;

        using var output = await OptimizeAsync(input, ct);
        output.Position = 0;

        var request = new PutObjectRequest
        {
            BucketName = _options.BucketName,
            Key = key,
            InputStream = output,
            ContentType = "image/webp",
            DisablePayloadSigning = true
        };

        await _s3.PutObjectAsync(request, ct);

        return key;
    }

    private async Task<Stream> OptimizeAsync(Stream input, CancellationToken ct)
    {
        using var image = await Image.LoadAsync(input, ct);

        if (image.Width > _options.MaxWidth)
        {
            var height = (int)Math.Round((double)image.Height * _options.MaxWidth / image.Width);
            image.Mutate(x => x.Resize(new Size(_options.MaxWidth, height)));
        }

        var output = new MemoryStream();
        await image.SaveAsync(output, new WebpEncoder { Quality = _options.Quality }, ct);
        output.Position = 0;

        return output;
    }
}