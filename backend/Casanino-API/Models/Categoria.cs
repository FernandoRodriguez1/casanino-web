namespace Casanino_API.Models;

public class Categoria
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Imagen { get; set; }

    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
}