using Casanino_API.Data;
using Casanino_API.DTOs;
using Casanino_API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Casanino_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdministradoresController : ControllerBase
{
    private readonly CasaninoDbContext _context;
    private readonly PasswordHasher<Administrador> _passwordHasher;

    public AdministradoresController(CasaninoDbContext context)
    {
        _context = context;
        _passwordHasher = new PasswordHasher<Administrador>();
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdministradorResponse>>> GetAdministradores()
    {
        var administradores = await _context.Administradores
            .OrderBy(a => a.Nombre)
            .Select(a => new AdministradorResponse(a.Id, a.Nombre))
            .ToListAsync();

        return Ok(administradores);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AdministradorResponse>> GetAdministrador(int id)
    {
        var administrador = await _context.Administradores.FindAsync(id);
        if (administrador is null)
        {
            return NotFound(new { message = $"No se encontró el administrador con id {id}" });
        }

        return Ok(new AdministradorResponse(administrador.Id, administrador.Nombre));
    }

    [HttpPost]
    public async Task<ActionResult<AdministradorResponse>> CreateAdministrador([FromBody] CreateAdministradorRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return BadRequest(new { message = "El nombre es obligatorio" });
        }

        if (string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "La contraseña es obligatoria" });
        }

        var administrador = new Administrador
        {
            Nombre = dto.Nombre.Trim(),
            PasswordHash = _passwordHasher.HashPassword(null!, dto.Password)
        };

        try
        {
            _context.Administradores.Add(administrador);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe un administrador con ese nombre" });
        }

        return CreatedAtAction(
            nameof(GetAdministrador),
            new { id = administrador.Id },
            new AdministradorResponse(administrador.Id, administrador.Nombre));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAdministrador(int id, [FromBody] UpdateAdministradorRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
        {
            return BadRequest(new { message = "El nombre es obligatorio" });
        }

        var administrador = await _context.Administradores.FindAsync(id);
        if (administrador is null)
        {
            return NotFound(new { message = $"No se encontró el administrador con id {id}" });
        }

        administrador.Nombre = dto.Nombre.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            administrador.PasswordHash = _passwordHasher.HashPassword(null!, dto.Password);
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Ya existe un administrador con ese nombre" });
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAdministrador(int id)
    {
        var administrador = await _context.Administradores.FindAsync(id);
        if (administrador is null)
        {
            return NotFound(new { message = $"No se encontró el administrador con id {id}" });
        }

        _context.Administradores.Remove(administrador);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}