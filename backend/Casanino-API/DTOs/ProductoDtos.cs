namespace Casanino_API.DTOs;

public record CreateProductoRequest(
    string Codigo,
    string Modelo,
    string Nombre,
    string? Descripcion,
    string? Imagen,
    int CategoriaId,
    int MarcaId,
    string? Especificaciones,
    string? Accesorios);

public record UpdateProductoRequest(
    string Codigo,
    string Modelo,
    string Nombre,
    string? Descripcion,
    string? Imagen,
    int CategoriaId,
    int MarcaId,
    string? Especificaciones,
    string? Accesorios);

public record ProductoResponse(
    int Id,
    string Codigo,
    string Modelo,
    string Nombre,
    string? Descripcion,
    string? Imagen,
    int CategoriaId,
    string CategoriaNombre,
    int MarcaId,
    string MarcaNombre,
    string? Especificaciones,
    string? Accesorios);