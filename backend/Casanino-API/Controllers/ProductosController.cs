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
public class ProductosController : ControllerBase
{
    private readonly CasaninoDbContext _context;
    private readonly ImagenR2Service _imagenService;

    public ProductosController(CasaninoDbContext context, ImagenR2Service imagenService)
    {
        _context = context;
        _imagenService = imagenService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ProductoResponse>>> GetProductos()
    {
        var productos = await _context.Productos
            .OrderBy(p => p.Nombre)
            .Select(p => new ProductoResponse(
                p.Id,
                p.Codigo,
                p.Modelo,
                p.Nombre,
                p.Descripcion,
                p.Imagenes,
                p.CategoriaId,
                p.Categoria.Nombre,
                p.MarcaId,
                p.Marca.Nombre,
                p.Especificaciones,
                p.Accesorios))
            .ToListAsync();

        return Ok(productos);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProductoResponse>> GetProducto(int id)
    {
        var producto = await _context.Productos
            .Include(p => p.Categoria)
            .Include(p => p.Marca)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (producto is null)
        {
            return NotFound(new { message = $"No se encontró el producto con id {id}" });
        }

        return Ok(new ProductoResponse(
            producto.Id,
            producto.Codigo,
            producto.Modelo,
            producto.Nombre,
            producto.Descripcion,
            producto.Imagenes,
            producto.CategoriaId,
            producto.Categoria.Nombre,
            producto.MarcaId,
            producto.Marca.Nombre,
            producto.Especificaciones,
            producto.Accesorios));
    }

    [HttpPost]
    public async Task<ActionResult<ProductoResponse>> CreateProducto([FromForm] CreateProductoRequest dto)
    {
        var validationError = await ValidateProducto(dto.Codigo, dto.Nombre, dto.CategoriaId, dto.MarcaId);
        if (validationError is not null)
        {
            return validationError;
        }

        var uploadedKeys = new List<string>();
        var urls = new List<string>();

        if (dto.Imagenes is not null)
        {
            foreach (var file in dto.Imagenes)
            {
                if (file.Length > ImagenR2Service.MaxFileSize)
                {
                    await DeleteImagenesBestEffort(uploadedKeys);
                    return BadRequest(new { message = $"La imagen {file.FileName} excede el tamaño máximo de 10 MB" });
                }

                var result = await UploadImagen(file, dto.Codigo, dto.Nombre);
                if (result.Error is not null)
                {
                    await DeleteImagenesBestEffort(uploadedKeys);
                    return result.Error;
                }

                uploadedKeys.Add(result.Key!);
                urls.Add(_imagenService.BuildPublicUrl(result.Key!));
            }
        }

        var producto = new Producto
        {
            Codigo = dto.Codigo.Trim(),
            Modelo = string.IsNullOrWhiteSpace(dto.Modelo) ? null : dto.Modelo.Trim(),
            Nombre = dto.Nombre.Trim(),
            Descripcion = dto.Descripcion,
            Imagenes = urls.Count == 0 ? null : urls,
            CategoriaId = dto.CategoriaId,
            MarcaId = dto.MarcaId,
            Especificaciones = dto.Especificaciones,
            Accesorios = dto.Accesorios
        };

        try
        {
            _context.Productos.Add(producto);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            await DeleteImagenesBestEffort(uploadedKeys);
            return Conflict(new { message = "Ya existe un producto con ese código" });
        }

        return CreatedAtAction(
            nameof(GetProducto),
            new { id = producto.Id },
            await GetProductoResponse(producto.Id));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProducto(int id, [FromForm] UpdateProductoRequest dto)
    {
        var producto = await _context.Productos.FindAsync(id);
        if (producto is null)
        {
            return NotFound(new { message = $"No se encontró el producto con id {id}" });
        }

        var validationError = await ValidateProducto(dto.Codigo, dto.Nombre, dto.CategoriaId, dto.MarcaId);
        if (validationError is not null)
        {
            return validationError;
        }

        var previousImages = producto.Imagenes ?? [];
        var eliminate = dto.ImagenesEliminar ?? [];
        var eliminated = previousImages.Where(u => eliminate.Contains(u)).ToList();
        var preserved = previousImages.Where(u => !eliminate.Contains(u)).ToList();

        var uploadedKeys = new List<string>();
        var urlsToAppend = new List<string>();

        if (dto.Imagenes is not null)
        {
            foreach (var file in dto.Imagenes)
            {
                if (file.Length > ImagenR2Service.MaxFileSize)
                {
                    await DeleteImagenesBestEffort(uploadedKeys);
                    return BadRequest(new { message = $"La imagen {file.FileName} excede el tamaño máximo de 10 MB" });
                }

                var result = await UploadImagen(file, dto.Codigo, dto.Nombre);
                if (result.Error is not null)
                {
                    await DeleteImagenesBestEffort(uploadedKeys);
                    return result.Error;
                }

                uploadedKeys.Add(result.Key!);
                urlsToAppend.Add(_imagenService.BuildPublicUrl(result.Key!));
            }
        }

        var newImages = preserved.Concat(urlsToAppend).Distinct().ToList();

        producto.Codigo = dto.Codigo.Trim();
        producto.Modelo = string.IsNullOrWhiteSpace(dto.Modelo) ? null : dto.Modelo.Trim();
        producto.Nombre = dto.Nombre.Trim();
        producto.Descripcion = dto.Descripcion;
        producto.CategoriaId = dto.CategoriaId;
        producto.MarcaId = dto.MarcaId;
        producto.Especificaciones = dto.Especificaciones;
        producto.Accesorios = dto.Accesorios;
        producto.Imagenes = newImages.Count == 0 ? null : newImages;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            await DeleteImagenesBestEffort(uploadedKeys);
            return Conflict(new { message = "Ya existe un producto con ese código" });
        }

        foreach (var removedUrl in eliminated)
        {
            if (!await IsUrlReferencedAsync(removedUrl))
            {
                await DeleteImagenBestEffort(_imagenService.ExtractKey(removedUrl));
            }
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProducto(int id)
    {
        var producto = await _context.Productos.FindAsync(id);
        if (producto is null)
        {
            return NotFound(new { message = $"No se encontró el producto con id {id}" });
        }

        var imageKeys = producto.Imagenes;

        _context.Productos.Remove(producto);
        await _context.SaveChangesAsync();

        if (imageKeys is not null)
        {
            foreach (var url in imageKeys)
            {
                await DeleteImagenBestEffort(_imagenService.ExtractKey(url));
            }
        }

        return NoContent();
    }

    private async Task<(string? Key, ActionResult? Error)> UploadImagen(IFormFile file, string codigo, string nombre)
    {
        try
        {
            var key = await _imagenService.UploadProductoAsync(file, codigo, nombre);
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

    private async Task DeleteImagenesBestEffort(IEnumerable<string> keys)
    {
        foreach (var key in keys)
        {
            await DeleteImagenBestEffort(key);
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

    private async Task<bool> IsUrlReferencedAsync(string url)
    {
        if (await _context.Productos.AnyAsync(p => p.Imagenes != null && p.Imagenes.Contains(url)))
        {
            return true;
        }

        if (await _context.Categorias.AnyAsync(c => c.Imagen == url))
        {
            return true;
        }

        return false;
    }

    private async Task<ActionResult?> ValidateProducto(string codigo, string nombre, int categoriaId, int marcaId)
    {
        if (string.IsNullOrWhiteSpace(codigo))
        {
            return BadRequest(new { message = "El código es obligatorio" });
        }

        if (string.IsNullOrWhiteSpace(nombre))
        {
            return BadRequest(new { message = "El nombre es obligatorio" });
        }

        if (!await _context.Categorias.AnyAsync(c => c.Id == categoriaId))
        {
            return BadRequest(new { message = $"La categoría con id {categoriaId} no existe" });
        }

        if (!await _context.Marcas.AnyAsync(m => m.Id == marcaId))
        {
            return BadRequest(new { message = $"La marca con id {marcaId} no existe" });
        }

        return null;
    }

    private async Task<ProductoResponse?> GetProductoResponse(int id)
    {
        return await _context.Productos
            .Where(p => p.Id == id)
            .Select(p => new ProductoResponse(
                p.Id,
                p.Codigo,
                p.Modelo,
                p.Nombre,
                p.Descripcion,
                p.Imagenes,
                p.CategoriaId,
                p.Categoria.Nombre,
                p.MarcaId,
                p.Marca.Nombre,
                p.Especificaciones,
                p.Accesorios))
            .FirstOrDefaultAsync();
    }
}