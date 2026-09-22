namespace Casanino_API.DTOs;

public record CreateCategoriaRequest(string Nombre);
public record UpdateCategoriaRequest(string Nombre);
public record CategoriaResponse(int Id, string Nombre);