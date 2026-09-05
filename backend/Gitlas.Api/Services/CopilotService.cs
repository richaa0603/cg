using System.Net.Http.Json;
using System.Text.Json;
using Gitlas.Api.Models;

namespace Gitlas.Api.Services;

public sealed class CopilotService(HttpClient http, ILogger<CopilotService> logger) : ICopilotService
{
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private async Task<T> PostAsync<T>(string path, string requirement, CancellationToken ct)
    {
        logger.LogDebug("POST {Path} req={Req}", path, requirement);
        var resp = await http.PostAsJsonAsync(path, new { requirement }, _json, ct);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<T>(_json, ct)
            ?? throw new InvalidOperationException($"Null response from {path}");
    }

    public Task<IEnumerable<SimilarProject>> SearchProjectsAsync(string requirement, CancellationToken ct = default)
        => PostAsync<IEnumerable<SimilarProject>>("copilot/search", requirement, ct);

    public Task<IEnumerable<string>> RecommendComponentsAsync(string requirement, CancellationToken ct = default)
        => PostAsync<IEnumerable<string>>("copilot/components", requirement, ct);

    public Task<Architecture> RecommendArchitectureAsync(string requirement, CancellationToken ct = default)
        => PostAsync<Architecture>("copilot/architecture", requirement, ct);

    public Task<IEnumerable<Expert>> RecommendExpertsAsync(string requirement, CancellationToken ct = default)
        => PostAsync<IEnumerable<Expert>>("copilot/experts", requirement, ct);

    public Task<IEnumerable<string>> RecommendRisksAsync(string requirement, CancellationToken ct = default)
        => PostAsync<IEnumerable<string>>("copilot/risks", requirement, ct);

    public Task<FullAnalysis> GetFullAnalysisAsync(string requirement, CancellationToken ct = default)
        => PostAsync<FullAnalysis>("copilot/full-analysis", requirement, ct);
}
