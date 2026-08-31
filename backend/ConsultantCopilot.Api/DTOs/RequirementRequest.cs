using System.ComponentModel.DataAnnotations;

namespace ConsultantCopilot.Api.DTOs;

public sealed record RequirementRequest(
    [Required, MinLength(3)] string Requirement
);
