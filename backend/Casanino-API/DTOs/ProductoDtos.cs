using Microsoft.AspNetCore.Http;

namespace Casanino_API.DTOs;

public class CreateProductoRequest
{
    public string Codigo { get; set; } = string.Empty;
    public string? Modelo { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public int CategoriaId { get; set; }
    public int MarcaId { get; set; }
    public string? Especificaciones { get; set; }
    public string? Accesorios { get; set; }
    public List<IFormFile>? Imagenes { get; set; }
}

public class UpdateProductoRequest
{
    public string Codigo { get; set; } = string.Empty;
    public string? Modelo { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public int CategoriaId { get; set; }
    public int MarcaId { get; set; }
    public string? Especificaciones { get; set; }
    public string? Accesorios { get; set; }
    public List<IFormFile>? Imagenes { get; set; }
    public List<string>? ImagenesEliminar { get; set; }
}

public record ProductoResponse(
    int Id,
    string Codigo,
    string? Modelo,
    string Nombre,
    string? Descripcion,
    List<string>? Imagenes,
    int CategoriaId,
    string CategoriaNombre,
    int MarcaId,
    string MarcaNombre,
    string? Especificaciones,
    string? Accesorios);