using Casanino_API.Data;
using Casanino_API.DTOs;
using Casanino_API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Casanino_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MarcasController : ControllerBase
{
    private readonly CasaninoDbContext _context;

    public MarcasController(CasaninoDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MarcaResponse>>> GetMarcas()
    {
        var marcas = await _context.Marcas
            .OrderBy(m => m.Nombre)
            .Select(m => new MarcaResponse(m.Id, m.Nombre))
            .ToListAsync();

        return Ok(marcas);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MarcaResponse>> GetMarca(int id)
    {
        var marca = await _context.Marcas.FindAsync(id);
        if (marca is null)
        {
            return NotFound(new { message = $"No se encontró la marca con id {id}" });
        }

        return Ok(new MarcaResponse(marca.Id, marca.Nombre));
    }

    [HttpPost]
    public async Task<ActionResult<MarcaResponse>> CreateMarca([FromBody] CreateMarcaRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return BadRequest(new { message = "El nombre es obligatorio" });
        }

        var marca = new Marca { Nombre = dto.Nombre.Trim() };

        try
        {
            _context.Marcas.Add(marca);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe una marca con ese nombre" });
        }

        return CreatedAtAction(
            nameof(GetMarca),
            new { id = marca.Id },
            new MarcaResponse(marca.Id, marca.Nombre));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMarca(int id, [FromBody] UpdateMarcaRequest dto)
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

        marca.Nombre = dto.Nombre.Trim();

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe una marca con ese nombre" });
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

        try
        {
            _context.Marcas.Remove(marca);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "No se puede eliminar: la marca tiene productos asociados" });
        }

        return NoContent();
    }
}