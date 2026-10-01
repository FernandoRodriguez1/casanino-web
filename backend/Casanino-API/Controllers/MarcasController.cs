using Casanino_API.Data;
using Casanino_API.DTOs;
using Casanino_API.Models;
using Casanino_API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;

namespace Casanino_API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MarcasController : ControllerBase
{
    private readonly CasaninoDbContext _context;
    private readonly ImagenR2Service _imagenService;
    private readonly CatalogCacheService _catalogCache;

    public MarcasController(
        CasaninoDbContext context,
        ImagenR2Service imagenService,
        CatalogCacheService catalogCache)
    {
        _context = context;
        _imagenService = imagenService;
        _catalogCache = catalogCache;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<MarcaResponse>>> GetMarcas()
    {
        var marcas = await _context.Marcas
            .OrderBy(m => m.Nombre)
            .Select(m => new MarcaResponse(m.Id, m.Nombre, m.Imagen))
            .ToListAsync();

        return Ok(marcas);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<MarcaResponse>> GetMarca(int id)
    {
        var marca = await _context.Marcas.FindAsync(id);
        if (marca is null)
        {
            return NotFound(new { message = $"No se encontró la marca con id {id}" });
        }

        return Ok(new MarcaResponse(marca.Id, marca.Nombre, marca.Imagen));
    }

    [HttpPost]
    public async Task<ActionResult<MarcaResponse>> CreateMarca([FromForm] CreateMarcaRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return BadRequest(new { message = "El nombre es obligatorio" });
        }

        string? imagenKey = null;

        if (dto.Imagen is not null && dto.Imagen.Length > 0)
        {
            if (dto.Imagen.Length > ImagenR2Service.MaxFileSize)
            {
                return BadRequest(new { message = "La imagen excede el tamaño máximo de 10 MB" });
            }

            var result = await UploadImagen(dto.Imagen, dto.Nombre);
            if (result.Error is not null)
            {
                return result.Error;
            }

            imagenKey = result.Key;
        }

        var marca = new Marca
        {
            Nombre = dto.Nombre.Trim(),
            Imagen = imagenKey is null ? null : _imagenService.BuildPublicUrl(imagenKey)
        };

        try
        {
            _context.Marcas.Add(marca);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe una marca con ese nombre" });
        }

        _catalogCache.Invalidate();

        return CreatedAtAction(
            nameof(GetMarca),
            new { id = marca.Id },
            new MarcaResponse(marca.Id, marca.Nombre, marca.Imagen));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMarca(int id, [FromForm] UpdateMarcaRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return BadRequest(new { message = "El nombre es obligatorio" });
        }

        var marca = await _context.Marcas.FindAsync(id);
        if (marca is null)
        {
            return NotFound(new { message = $"No se encontró la marca con id {id}" });
        }

        var previousImage = marca.Imagen;
        var newImage = marca.Imagen;

        if (dto.Imagen is not null && dto.Imagen.Length > 0)
        {
            if (dto.Imagen.Length > ImagenR2Service.MaxFileSize)
            {
                return BadRequest(new { message = "La imagen excede el tamaño máximo de 10 MB" });
            }

            var result = await UploadImagen(dto.Imagen, dto.Nombre);
            if (result.Error is not null)
            {
                return result.Error;
            }

            newImage = _imagenService.BuildPublicUrl(result.Key!);
        }

        marca.Nombre = dto.Nombre.Trim();
        marca.Imagen = newImage;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe una marca con ese nombre" });
        }

        _catalogCache.Invalidate();

        if (!string.IsNullOrEmpty(previousImage) && previousImage != newImage)
        {
            await DeleteImagenBestEffort(_imagenService.ExtractKey(previousImage));
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMarca(int id)
    {
        var marca = await _context.Marcas.FindAsync(id);
        if (marca is null)
        {
            return NotFound(new { message = $"No se encontró la marca con id {id}" });
        }

        var imageKey = marca.Imagen;

        try
        {
            _context.Marcas.Remove(marca);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "No se puede eliminar: la marca tiene productos o categorías asociados" });
        }

        _catalogCache.Invalidate();

        if (!string.IsNullOrEmpty(imageKey))
        {
            await DeleteImagenBestEffort(_imagenService.ExtractKey(imageKey));
        }

        return NoContent();
    }

    private async Task<(string? Key, ActionResult? Error)> UploadImagen(IFormFile file, string nombre)
    {
        try
        {
            var key = await _imagenService.UploadMarcaAsync(file, nombre);
            return (key, null);
        }
        catch (UnknownImageFormatException)
        {
            return (null, BadRequest(new { message = "El archivo de imagen no es válido" }));
        }
        catch (InvalidImageContentException)
        {
            return (null, BadRequest(new { message = "El archivo de imagen está corrupto o no es válido" }));
        }
    }

    private async Task DeleteImagenBestEffort(string key)
    {
        try
        {
            await _imagenService.DeleteAsync(key);
        }
        catch (Exception)
        {
        }
    }
}