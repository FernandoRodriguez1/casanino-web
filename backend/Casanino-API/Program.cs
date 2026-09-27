using System.IO.Compression;
using System.Text;
using Amazon.Runtime;
using Amazon.S3;
using Casanino_API.Config;
using Casanino_API.Data;
using Casanino_API.Models;
using Casanino_API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var port = builder.Configuration["PORT"];
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Add services to the container.

// Guard de arranque: una connection string vacía o mal escrita en el panel de
// hosting fallaba recién en el primer request, con un error de Npgsql
// incomprensible. Con doble guion bajo en la variable de entorno, no con ":".
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Falta la connection string de la base de datos. " +
        "Definí la variable de entorno ConnectionStrings__DefaultConnection " +
        "(doble guion bajo) o la clave \"ConnectionStrings:DefaultConnection\" en appsettings.");
}

builder.Services.AddDbContext<CasaninoDbContext>(options =>
    options.UseNpgsql(
        connectionString,
        npgsql => npgsql.EnableRetryOnFailure()));

var r2Options = builder.Configuration.GetSection("CloudflareR2").Get<CloudflareR2Options>()
    ?? throw new InvalidOperationException("Falta la configuración CloudflareR2");

// Los secretos viven en variables de entorno. Si faltan, cortamos el arranque
// con un mensaje claro en vez de fallar en el primer request.
if (string.IsNullOrWhiteSpace(r2Options.AccessKey) || string.IsNullOrWhiteSpace(r2Options.SecretKey))
{
    throw new InvalidOperationException(
        "Faltan las credenciales de CloudflareR2. Definí las variables de entorno " +
        "CloudflareR2__AccessKey y CloudflareR2__SecretKey (doble guion bajo) " +
        "o las claves \"CloudflareR2:AccessKey\" y \"CloudflareR2:SecretKey\" en appsettings.");
}

builder.Services.AddSingleton(r2Options);

builder.Services.AddSingleton<IAmazonS3>(_ => new AmazonS3Client(
    new BasicAWSCredentials(r2Options.AccessKey, r2Options.SecretKey),
    new AmazonS3Config
    {
        ServiceURL = r2Options.ServiceUrl,
        ForcePathStyle = true
    }));

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()
    ?? throw new InvalidOperationException("Falta la configuración Jwt");

// El SymmetricSecurityKey se arma adentro del AddJwtBearer, que corre de forma
// perezosa en el primer request: sin este guard una clave vacía explodingaba con
// un IDX10703 incomprensible en vez de al arrancar.
if (string.IsNullOrWhiteSpace(jwtOptions.Key))
{
    throw new InvalidOperationException(
        "Falta la clave de firma de JWT. Definí la variable de entorno Jwt__Key " +
        "(doble guion bajo) o la clave \"Jwt:Key\" en appsettings.");
}

builder.Services.AddSingleton(jwtOptions);
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<ImagenR2Service>();
builder.Services.AddSingleton<CatalogCacheService>();
builder.Services.AddMemoryCache();

builder.Services.AddResponseCompression(options =>
{
    // Render termina TLS y reenvía X-Forwarded-Proto, así que en producción
    // Request.IsHttps ya es true: sin esto no se comprime nada.
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    // Optimal mapea a brotli quality 11 (máxima compresión)
    options.Level = CompressionLevel.Optimal;
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key))
        };
    });

builder.Services.AddAuthorization();

var allowedOrigins = (builder.Configuration["AllowedOrigins"] ?? string.Empty)
    .Split(';', ',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Ingresá el token JWT obtenido en /api/auth/login."
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CasaninoDbContext>();
    db.Database.EnsureCreated();

    if (!await db.Administradores.AnyAsync())
    {
        var seedNombre = builder.Configuration["SeedAdmin:Nombre"] ?? "casanino";
        var seedPassword = builder.Configuration["SeedAdmin:Password"] ?? "@juarezcelman751!";
        var hasher = new PasswordHasher<Administrador>();

        db.Administradores.Add(new Administrador
        {
            Nombre = seedNombre,
            PasswordHash = hasher.HashPassword(null!, seedPassword)
        });

        await db.SaveChangesAsync();
    }
}

// Configure the HTTP request pipeline.
app.UseForwardedHeaders();

app.UseResponseCompression();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("frontend");

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();