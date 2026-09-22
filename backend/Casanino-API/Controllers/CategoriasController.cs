using Casanino_API.Data;
using Casanino_API.DTOs;
using Casanino_API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Casanino_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriasController : ControllerBase
{
    private readonly CasaninoDbContext _context;

    public CategoriasController(CasaninoDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoriaResponse>>> GetCategorias()
    {
        var categorias = await _context.Categorias
            .OrderBy(c => c.Nombre)
            .Select(c => new CategoriaResponse(c.Id, c.Nombre))
            .ToListAsync();

        return Ok(categorias);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoriaResponse>> GetCategoria(int id)
    {
        var categoria = await _context.Categorias.FindAsync(id);
        if (categoria is null)
        {
            return NotFound(new { message = $"No se encontró la categoría con id {id}" });
        }

        return Ok(new CategoriaResponse(categoria.Id, categoria.Nombre));
    }

    [HttpPost]
    public async Task<ActionResult<CategoriaResponse>> CreateCategoria([FromBody] CreateCategoriaRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return BadRequest(new { message = "El nombre es obligatorio" });
        }

        var categoria = new Categoria { Nombre = dto.Nombre.Trim() };

        try
        {
            _context.Categorias.Add(categoria);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe una categoría con ese nombre" });
        }

        return CreatedAtAction(
            nameof(GetCategoria),
            new { id = categoria.Id },
            new CategoriaResponse(categoria.Id, categoria.Nombre));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategoria(int id, [FromBody] UpdateCategoriaRequest dto)
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

        categoria.Nombre = dto.Nombre.Trim();

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe una categoría con ese nombre" });
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

        try
        {
            _context.Categorias.Remove(categoria);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "No se puede eliminar: la categoría tiene productos asociados" });
        }

        return NoContent();
    }
}