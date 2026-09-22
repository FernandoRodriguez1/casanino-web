namespace Casanino_API.Config;

public class CloudflareR2Options
{
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string ServiceUrl { get; set; } = string.Empty;
    public string BucketName { get; set; } = string.Empty;
    public int MaxWidth { get; set; } = 1200;
    public int Quality { get; set; } = 80;
}