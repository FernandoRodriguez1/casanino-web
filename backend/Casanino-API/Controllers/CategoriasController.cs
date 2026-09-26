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
public class CategoriasController : ControllerBase
{
    private readonly CasaninoDbContext _context;
    private readonly ImagenR2Service _imagenService;
    private readonly CatalogCacheService _catalogCache;

    public CategoriasController(
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
    public async Task<ActionResult<IEnumerable<CategoriaResponse>>> GetCategorias()
    {
        var categorias = await _context.Categorias
            .OrderBy(c => c.Nombre)
            .Select(c => new CategoriaResponse(c.Id, c.Nombre, c.Imagen))
            .ToListAsync();

        return Ok(categorias);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<CategoriaResponse>> GetCategoria(int id)
    {
        var categoria = await _context.Categorias.FindAsync(id);
        if (categoria is null)
        {
            return NotFound(new { message = $"No se encontró la categoría con id {id}" });
        }

        return Ok(new CategoriaResponse(categoria.Id, categoria.Nombre, categoria.Imagen));
    }

    [HttpPost]
    public async Task<ActionResult<CategoriaResponse>> CreateCategoria([FromForm] CreateCategoriaRequest dto)
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

        var categoria = new Categoria
        {
            Nombre = dto.Nombre.Trim(),
            Imagen = imagenKey is null ? null : _imagenService.BuildPublicUrl(imagenKey)
        };

        try
        {
            _context.Categorias.Add(categoria);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe una categoría con ese nombre" });
        }

        _catalogCache.Invalidate();

        return CreatedAtAction(
            nameof(GetCategoria),
            new { id = categoria.Id },
            new CategoriaResponse(categoria.Id, categoria.Nombre, categoria.Imagen));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategoria(int id, [FromForm] UpdateCategoriaRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return BadRequest(new { message = "El nombre es obligatorio" });
        }

        var categoria = await _context.Categorias.FindAsync(id);
        if (categoria is null)
        {
            return NotFound(new { message = $"No se encontró la categoría con id {id}" });
        }

        var previousImage = categoria.Imagen;
        var newImage = categoria.Imagen;

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

        categoria.Nombre = dto.Nombre.Trim();
        categoria.Imagen = newImage;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe una categoría con ese nombre" });
        }

        _catalogCache.Invalidate();

        if (!string.IsNullOrEmpty(previousImage) && previousImage != newImage)
        {
            await DeleteImagenBestEffort(_imagenService.ExtractKey(previousImage));
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategoria(int id)
    {
        var categoria = await _context.Categorias.FindAsync(id);
        if (categoria is null)
        {
            return NotFound(new { message = $"No se encontró la categoría con id {id}" });
        }

        var imageKey = categoria.Imagen;

        try
        {
            _context.Categorias.Remove(categoria);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "No se puede eliminar: la categoría tiene productos asociados" });
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
            var key = await _imagenService.UploadCategoriaAsync(file, nombre);
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