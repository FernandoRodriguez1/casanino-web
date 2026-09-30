using System.Security.Cryptography;
using System.Text;
using Casanino_API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Casanino_API.Controllers;

// Ping diario para que Supabase no pause el proyecto del plan free por inactividad.
// No lleva [Authorize]: se protege con la clave propia, vía header X-Health-Key
// o query ?key= (para monitores como UptimeRobot que no mandan headers).
[ApiController]
[Route("api/health")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    private const string KeyHeaderName = "X-Health-Key";

    private readonly CasaninoDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<HealthController> _logger;

    public HealthController(
        CasaninoDbContext context,
        IConfiguration configuration,
        ILogger<HealthController> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    // UptimeRobot (plan free) manda HEAD por defecto en los monitores HTTP; GET
    // sólo en los de tipo Keyword. Por eso la acción acepta ambos métodos.
    [HttpGet("database")]
    [HttpHead("database")]
    public async Task<IActionResult> Database(CancellationToken cancellationToken)
    {
        var expectedKey = _configuration["HealthCheck:Key"];

        // Fail-safe: sin clave configurada siempre 401, nunca un endpoint abierto.
        if (string.IsNullOrWhiteSpace(expectedKey))
        {
            _logger.LogWarning("Health check de base de datos sin HealthCheck:Key configurado. Se rechaza el request.");
            return Unauthorized();
        }

        var providedKey = Request.Headers[KeyHeaderName].ToString();

        // UptimeRobot (plan free) no manda headers custom: sólo una URL. Por eso
        // la clave también se acepta por query. El header tiene prioridad.
        if (string.IsNullOrEmpty(providedKey))
        {
            providedKey = Request.Query["key"].ToString();
        }

        if (!KeysMatch(expectedKey, providedKey))
        {
            _logger.LogWarning("Health check de base de datos con clave inválida.");
            return Unauthorized();
        }

        try
        {
            // Query real y no sólo CanConnect: lo que Supabase cuenta como
            // actividad es ejecución de queries.
            await _context.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);
        }
        catch (Exception ex)
        {
            // El 503 es lo que dispara la alerta del monitor, no lo conviertas
            // en 200 ni en un 500 genérico.
            _logger.LogError(ex, "Falló el health check de la base de datos.");
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new { status = "database_unavailable" });
        }

        return Ok(new
        {
            status = "ok",
            checkedAt = DateTime.UtcNow.ToString("o")
        });
    }

    private static bool KeysMatch(string expected, string provided)
    {
        // FixedTimeEquals sobre los bytes UTF-8: comparar strings con != es
        // filtrable por timing. Si el header no vino, provided queda vacío y la
        // comparación falla por largo, no por contenido.
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(provided));
    }
}
