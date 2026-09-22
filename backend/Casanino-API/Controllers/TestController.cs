using Casanino_API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Casanino_API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    private readonly CasaninoDbContext _context;

    public TestController(CasaninoDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult Get()
    {
        bool canConnect = _context.Database.CanConnect();

        if (!canConnect)
        {
            return StatusCode(503, new
            {
                connected = false,
                message = "No se pudo conectar a la base de datos"
            });
        }

        return Ok(new
        {
            connected = true,
            message = "Conexión a la base de datos exitosa",
            database = _context.Database.GetDbConnection().Database
        });
    }
}