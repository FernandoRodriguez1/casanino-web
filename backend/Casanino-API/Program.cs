using Amazon.Runtime;
using Amazon.S3;
using Casanino_API.Config;
using Casanino_API.Data;
using Casanino_API.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddDbContext<CasaninoDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var r2Options = builder.Configuration.GetSection("CloudflareR2").Get<CloudflareR2Options>()
    ?? throw new InvalidOperationException("Falta la configuración CloudflareR2");

builder.Services.AddSingleton(r2Options);

builder.Services.AddSingleton<IAmazonS3>(_ => new AmazonS3Client(
    new BasicAWSCredentials(r2Options.AccessKey, r2Options.SecretKey),
    new AmazonS3Config
    {
        ServiceURL = r2Options.ServiceUrl,
        ForcePathStyle = true
    }));

builder.Services.AddSingleton<ImagenR2Service>();

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
