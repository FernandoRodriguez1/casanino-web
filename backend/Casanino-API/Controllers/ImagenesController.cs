using Amazon.S3;
using Casanino_API.Data;
using Casanino_API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Casanino_API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ImagenesController : ControllerBase
{
    private readonly CasaninoDbContext _context;
    private readonly ImagenR2Service _imagenService;

    public ImagenesController(CasaninoDbContext context, ImagenR2Service imagenService)
    {
        _context = context;
        _imagenService = imagenService;
    }

    [HttpDelete]
    public async Task<IActionResult> Delete([FromQuery] string url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return BadRequest(new { message = "La url de la imagen es obligatoria" });
        }

        var cleanUrl = url.Trim();
        var key = _imagenService.ExtractKey(cleanUrl);

        var productos = await _context.Productos
            .Where(p => p.Imagenes != null && p.Imagenes.Contains(cleanUrl))
            .ToListAsync();

        foreach (var producto in productos)
        {
            producto.Imagenes!.Remove(cleanUrl);
            if (producto.Imagenes.Count == 0)
            {
                producto.Imagenes = null;
            }
        }

        var categorias = await _context.Categorias
            .Where(c => c.Imagen == cleanUrl)
            .ToListAsync();

        foreach (var categoria in categorias)
        {
            categoria.Imagen = null;
        }

        if (productos.Count > 0 || categorias.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

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