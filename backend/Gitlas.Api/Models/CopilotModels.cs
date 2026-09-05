namespace Gitlas.Api.Models;

public sealed record SimilarProject(
    string Repository,
    int Score,
    string Language,
    int Stars,
    string Url = ""
);

public sealed record Architecture(
    string Frontend,
    string Backend,
    string Database,
    string Cloud
);

public sealed record Expert(string Name, int Score);

public sealed record FullAnalysis(
    IEnumerable<SimilarProject> Projects,
    IEnumerable<string> Components,
    Architecture Architecture,
    IEnumerable<Expert> Experts,
    IEnumerable<string> Risks
);
