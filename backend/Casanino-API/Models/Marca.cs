namespace Casanino_API.Models;

public class Marca
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;

    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
}