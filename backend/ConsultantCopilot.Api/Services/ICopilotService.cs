using ConsultantCopilot.Api.Models;

namespace ConsultantCopilot.Api.Services;

public interface ICopilotService
{
    Task<IEnumerable<SimilarProject>> SearchProjectsAsync(string requirement, CancellationToken ct = default);
    Task<IEnumerable<string>> RecommendComponentsAsync(string requirement, CancellationToken ct = default);
    Task<Architecture> RecommendArchitectureAsync(string requirement, CancellationToken ct = default);
    Task<IEnumerable<Expert>> RecommendExpertsAsync(string requirement, CancellationToken ct = default);
    Task<IEnumerable<string>> RecommendRisksAsync(string requirement, CancellationToken ct = default);
    Task<FullAnalysis> GetFullAnalysisAsync(string requirement, CancellationToken ct = default);
}
