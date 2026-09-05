using Gitlas.Api.DTOs;
using Gitlas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Gitlas.Api.Controllers;

[ApiController]
[Route("api/copilot")]
[Produces("application/json")]
public sealed class CopilotController(
    ICopilotService copilot,
    ILogger<CopilotController> logger) : ControllerBase
{
    [HttpPost("search")]
    public async Task<IActionResult> Search([FromBody] RequirementRequest req, CancellationToken ct)
    {
        logger.LogInformation("Search: {Req}", req.Requirement);
        return Ok(await copilot.SearchProjectsAsync(req.Requirement, ct));
    }

    [HttpPost("components")]
    public async Task<IActionResult> Components([FromBody] RequirementRequest req, CancellationToken ct)
        => Ok(await copilot.RecommendComponentsAsync(req.Requirement, ct));

    [HttpPost("architecture")]
    public async Task<IActionResult> Architecture([FromBody] RequirementRequest req, CancellationToken ct)
        => Ok(await copilot.RecommendArchitectureAsync(req.Requirement, ct));

    [HttpPost("experts")]
    public async Task<IActionResult> Experts([FromBody] RequirementRequest req, CancellationToken ct)
        => Ok(await copilot.RecommendExpertsAsync(req.Requirement, ct));

    [HttpPost("risks")]
    public async Task<IActionResult> Risks([FromBody] RequirementRequest req, CancellationToken ct)
        => Ok(await copilot.RecommendRisksAsync(req.Requirement, ct));

    [HttpPost("full-analysis")]
    public async Task<IActionResult> FullAnalysis([FromBody] RequirementRequest req, CancellationToken ct)
    {
        logger.LogInformation("Full analysis: {Req}", req.Requirement);
        return Ok(await copilot.GetFullAnalysisAsync(req.Requirement, ct));
    }
}
