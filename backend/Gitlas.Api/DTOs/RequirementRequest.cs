using System.ComponentModel.DataAnnotations;

namespace Gitlas.Api.DTOs;

public sealed record RequirementRequest(
    [Required, MinLength(3)] string Requirement
);
