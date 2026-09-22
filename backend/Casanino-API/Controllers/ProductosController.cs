using Casanino_API.Data;
using Casanino_API.DTOs;
using Casanino_API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Casanino_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductosController : ControllerBase
{
    private readonly CasaninoDbContext _context;

    public ProductosController(CasaninoDbContext context)
    {
        _context = context;
    }

    [HttpGet]
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
                p.Imagen,
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
            producto.Imagen,
            producto.CategoriaId,
            producto.Categoria.Nombre,
            producto.MarcaId,
            producto.Marca.Nombre,
            producto.Especificaciones,
            producto.Accesorios));
    }

    [HttpPost]
    public async Task<ActionResult<ProductoResponse>> CreateProducto([FromBody] CreateProductoRequest dto)
    {
        var validationError = await ValidateProducto(dto.Codigo, dto.Modelo, dto.Nombre, dto.CategoriaId, dto.MarcaId);
        if (validationError is not null)
        {
            return validationError;
        }

        var producto = new Producto
        {
            Codigo = dto.Codigo.Trim(),
            Modelo = dto.Modelo.Trim(),
            Nombre = dto.Nombre.Trim(),
            Descripcion = dto.Descripcion,
            Imagen = dto.Imagen,
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
            return Conflict(new { message = "Ya existe un producto con ese código" });
        }

        return CreatedAtAction(
            nameof(GetProducto),
            new { id = producto.Id },
            await GetProductoResponse(producto.Id));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProducto(int id, [FromBody] UpdateProductoRequest dto)
    {
        var producto = await _context.Productos.FindAsync(id);
        if (producto is null)
        {
            return NotFound(new { message = $"No se encontró el producto con id {id}" });
        }

        var validationError = await ValidateProducto(dto.Codigo, dto.Modelo, dto.Nombre, dto.CategoriaId, dto.MarcaId);
        if (validationError is not null)
        {
            return validationError;
        }

        producto.Codigo = dto.Codigo.Trim();
        producto.Modelo = dto.Modelo.Trim();
        producto.Nombre = dto.Nombre.Trim();
        producto.Descripcion = dto.Descripcion;
        producto.Imagen = dto.Imagen;
        producto.CategoriaId = dto.CategoriaId;
        producto.MarcaId = dto.MarcaId;
        producto.Especificaciones = dto.Especificaciones;
        producto.Accesorios = dto.Accesorios;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe un producto con ese código" });
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

        _context.Productos.Remove(producto);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<ActionResult?> ValidateProducto(string codigo, string modelo, string nombre, int categoriaId, int marcaId)
    {
        if (string.IsNullOrWhiteSpace(codigo))
        {
            return BadRequest(new { message = "El código es obligatorio" });
        }

        if (string.IsNullOrWhiteSpace(modelo))
        {
            return BadRequest(new { message = "El modelo es obligatorio" });
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
                p.Imagen,
                p.CategoriaId,
                p.Categoria.Nombre,
                p.MarcaId,
                p.Marca.Nombre,
                p.Especificaciones,
                p.Accesorios))
            .FirstOrDefaultAsync();
    }
}