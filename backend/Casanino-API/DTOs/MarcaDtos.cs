namespace Casanino_API.DTOs;

public record CreateMarcaRequest(string Nombre);
public record UpdateMarcaRequest(string Nombre);
public record MarcaResponse(int Id, string Nombre);