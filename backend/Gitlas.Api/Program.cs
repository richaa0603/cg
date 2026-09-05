using System.Text.Json;
using Gitlas.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Services ─────────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
    c.SwaggerDoc("v1", new() { Title = "Gitlas API", Version = "v1" }));

var pythonBase = builder.Configuration["PythonAiService:BaseUrl"]
    ?? throw new InvalidOperationException("PythonAiService:BaseUrl is required in appsettings.json");

builder.Services.AddHttpClient<ICopilotService, CopilotService>(client =>
{
    client.BaseAddress = new Uri(pythonBase);
    client.Timeout = TimeSpan.FromSeconds(90);
});

builder.Services.AddCors(options =>
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(
                builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                    ?? ["http://localhost:5173", "http://localhost:4173"])
              .AllowAnyMethod()
              .AllowAnyHeader()));

builder.Services.AddHealthChecks()
    .AddUrlGroup(new Uri(pythonBase + "health"), name: "python-ai");

builder.Logging.AddConsole();

// ── Pipeline ──────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Gitlas API v1"));

app.UseCors("Frontend");
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
