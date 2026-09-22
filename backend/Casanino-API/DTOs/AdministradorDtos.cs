namespace Casanino_API.DTOs;

public record CreateAdministradorRequest(string Nombre, string Password);
public record UpdateAdministradorRequest(string Nombre, string? Password);
public record AdministradorResponse(int Id, string Nombre);