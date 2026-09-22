namespace Casanino_API.Models;

public class Administrador
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
}