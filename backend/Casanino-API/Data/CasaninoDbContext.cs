using Casanino_API.Models;
using Microsoft.EntityFrameworkCore;

namespace Casanino_API.Data;

public class CasaninoDbContext : DbContext
{
    public CasaninoDbContext(DbContextOptions<CasaninoDbContext> options)
        : base(options)
    {
    }

    public DbSet<Categoria> Categorias { get; set; }
    public DbSet<Marca> Marcas { get; set; }
    public DbSet<Administrador> Administradores { get; set; }
    public DbSet<Producto> Productos { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Categoria>(entity =>
        {
            entity.ToTable("categoria");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(c => c.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
            entity.HasIndex(c => c.Nombre).IsUnique();
            entity.Property(c => c.Imagen).HasColumnName("imagen");
        });

        modelBuilder.Entity<Marca>(entity =>
        {
            entity.ToTable("marca");
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(m => m.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
            entity.HasIndex(m => m.Nombre).IsUnique();
        });

        modelBuilder.Entity<Administrador>(entity =>
        {
            entity.ToTable("administrador");
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(a => a.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
            entity.HasIndex(a => a.Nombre).IsUnique();
            entity.Property(a => a.PasswordHash).HasColumnName("password_hash").IsRequired();
        });

        modelBuilder.Entity<Producto>(entity =>
        {
            entity.ToTable("producto");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(p => p.Codigo).HasColumnName("codigo").HasMaxLength(100).IsRequired();
            entity.HasIndex(p => p.Codigo).IsUnique();
            entity.Property(p => p.Modelo).HasColumnName("modelo").HasMaxLength(100);
            entity.Property(p => p.Nombre).HasColumnName("nombre").HasMaxLength(200).IsRequired();
            entity.Property(p => p.Descripcion).HasColumnName("descripcion");
            entity.Property(p => p.Imagenes).HasColumnName("imagen");
            entity.Property(p => p.CategoriaId).HasColumnName("categoria_id").IsRequired();
            entity.Property(p => p.MarcaId).HasColumnName("marca_id").IsRequired();
            entity.Property(p => p.Especificaciones).HasColumnName("especificaciones");
            entity.Property(p => p.Accesorios).HasColumnName("accesorios");

            entity.HasOne(p => p.Categoria)
                .WithMany(c => c.Productos)
                .HasForeignKey(p => p.CategoriaId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.Marca)
                .WithMany(m => m.Productos)
                .HasForeignKey(p => p.MarcaId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}