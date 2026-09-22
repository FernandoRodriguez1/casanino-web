namespace Casanino_API.Models;

public class Producto
{
    public int Id { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Imagen { get; set; }
    public int CategoriaId { get; set; }
    public int MarcaId { get; set; }
    public string? Especificaciones { get; set; }
    public string? Accesorios { get; set; }

    public Categoria Categoria { get; set; } = null!;
    public Marca Marca { get; set; } = null!;
}