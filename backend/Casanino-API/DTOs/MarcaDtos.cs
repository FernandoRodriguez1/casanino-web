using Microsoft.AspNetCore.Http;

namespace Casanino_API.DTOs;

public class CreateMarcaRequest
{
    public string Nombre { get; set; } = string.Empty;
    public IFormFile? Imagen { get; set; }
}

public class UpdateMarcaRequest
{
    public string Nombre { get; set; } = string.Empty;
    public IFormFile? Imagen { get; set; }
}

public record MarcaResponse(int Id, string Nombre, string? Imagen);