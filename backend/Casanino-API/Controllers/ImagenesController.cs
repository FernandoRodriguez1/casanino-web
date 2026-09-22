using Amazon.S3;
using Casanino_API.Config;
using Microsoft.AspNetCore.Mvc;

namespace Casanino_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ImagenesController : ControllerBase
{
    private readonly IAmazonS3 _s3;
    private readonly CloudflareR2Options _r2Options;

    public ImagenesController(IAmazonS3 s3, CloudflareR2Options r2Options)
    {
        _s3 = s3;
        _r2Options = r2Options;
    }

    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return BadRequest(new { message = "La clave de la imagen es obligatoria" });
        }

        try
        {
            await _s3.DeleteObjectAsync(_r2Options.BucketName, key.Trim());
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return NotFound(new { message = $"No se encontró la imagen con clave {key}" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "No se pudo eliminar la imagen de Cloudflare R2", error = ex.Message });
        }

        return NoContent();
    }
}