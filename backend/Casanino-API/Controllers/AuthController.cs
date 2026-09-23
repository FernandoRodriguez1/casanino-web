using Casanino_API.Data;
using Casanino_API.DTOs;
using Casanino_API.Models;
using Casanino_API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Casanino_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly CasaninoDbContext _context;
    private readonly TokenService _tokenService;
    private readonly PasswordHasher<Administrador> _passwordHasher;

    public AuthController(CasaninoDbContext context, TokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
        _passwordHasher = new PasswordHasher<Administrador>();
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "El nombre y la contraseña son obligatorios" });
        }

        var administrador = await _context.Administradores
            .SingleOrDefaultAsync(a => a.Nombre == dto.Nombre.Trim());

        if (administrador is null)
        {
            return Unauthorized(new { message = "Credenciales inválidas" });
        }

        var result = _passwordHasher.VerifyHashedPassword(administrador, administrador.PasswordHash, dto.Password);

        if (result == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "Credenciales inválidas" });
        }

        return Ok(new
        {
            token = _tokenService.GenerateToken(administrador),
            administrador = new AdministradorResponse(administrador.Id, administrador.Nombre)
        });
    }
}