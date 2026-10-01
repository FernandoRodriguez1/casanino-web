using Microsoft.AspNetCore.Http;

namespace Casanino_API.DTOs;

public class CreateCategoriaRequest
{
    public string Nombre { get; set; } = string.Empty;
    public IFormFile? Imagen { get; set; }
    public int? MarcaId { get; set; }
}

public class UpdateCategoriaRequest
{
    public string Nombre { get; set; } = string.Empty;
    public IFormFile? Imagen { get; set; }
    public int? MarcaId { get; set; }
}

public record CategoriaResponse(int Id, string Nombre, string? Imagen, int? MarcaId);