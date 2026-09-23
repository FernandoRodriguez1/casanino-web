using Amazon.S3;
using Casanino_API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Casanino_API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ImagenesController : ControllerBase
{
    private readonly ImagenR2Service _imagenService;

    public ImagenesController(ImagenR2Service imagenService)
    {
        _imagenService = imagenService;
    }

    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] string url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return BadRequest(new { message = "La url de la imagen es obligatoria" });
        }

        var key = _imagenService.ExtractKey(url.Trim());

        try
        {
            await _imagenService.DeleteAsync(key);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return NotFound(new { message = $"No se encontró la imagen {url}" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "No se pudo eliminar la imagen de Cloudflare R2", error = ex.Message });
        }

        return NoContent();
    }
}