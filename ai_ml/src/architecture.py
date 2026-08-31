"""Architecture Recommendation Engine — Phase 2 Module 3.

Derives {frontend, backend, database, cloud} stack recommendation
from repository corpus technology frequencies and requirement domain signals.
"""
import argparse
import json
from collections import Counter
from typing import Any

from .config import PROCESSED_REPOSITORIES_JSON

# Per-layer technology options with detection keywords
_TECH_LAYERS: dict[str, dict[str, list[str]]] = {
    "frontend": {
        "React":             ["react", "nextjs", "next.js", "react-native", "redux", "vite"],
        "Angular":           ["angular", "angularjs", "@angular"],
        "Vue":               ["vue", "nuxt", "nuxtjs", "vuex"],
        "Blazor":            ["blazor", "webassembly", "wasm"],
        "Plain JavaScript":  ["javascript", "jquery", "vanilla"],
    },
    "backend": {
        ".NET":         ["dotnet", ".net", "csharp", "c#", "asp.net", "aspnet", "webapi"],
        "Spring Boot":  ["spring", "spring boot", "java", "kotlin", "maven", "gradle"],
        "Node.js":      ["node", "express", "nestjs", "fastify", "koa"],
        "FastAPI":      ["fastapi", "flask", "django", "python"],
        "Go":           ["golang", "gin", "fiber", "go"],
        "Ruby on Rails": ["rails", "ruby"],
    },
    "database": {
        "PostgreSQL": ["postgres", "postgresql"],
        "MySQL":      ["mysql", "mariadb"],
        "MongoDB":    ["mongo", "mongodb"],
        "SQL Server": ["mssql", "sql server", "sqlserver"],
        "Redis":      ["redis"],
        "SQLite":     ["sqlite"],
    },
    "cloud": {
        "Azure":       ["azure", "aks", "azure functions", "cosmos", "bicep", "arm template"],
        "AWS":         ["aws", "lambda", "ec2", "s3", "rds", "eks", "cloudformation"],
        "GCP":         ["gcp", "google cloud", "gke", "bigquery", "firestore"],
        "Kubernetes":  ["kubernetes", "k8s", "helm", "istio", "kubectl"],
        "Docker":      ["docker", "compose", "dockerfile", "container"],
    },
}

# Domain → stack shortcut; used when corpus is absent or small
_DOMAIN_STACKS: dict[str, dict[str, str]] = {
    "attendance":  {"frontend": "React", "backend": ".NET",        "database": "PostgreSQL", "cloud": "Azure"},
    "insurance":   {"frontend": "React", "backend": ".NET",        "database": "PostgreSQL", "cloud": "Azure"},
    "claims":      {"frontend": "React", "backend": ".NET",        "database": "PostgreSQL", "cloud": "Azure"},
    "payroll":     {"frontend": "React", "backend": ".NET",        "database": "PostgreSQL", "cloud": "Azure"},
    "hr":          {"frontend": "React", "backend": ".NET",        "database": "PostgreSQL", "cloud": "Azure"},
    "consulting":  {"frontend": "React", "backend": ".NET",        "database": "PostgreSQL", "cloud": "Azure"},
    "project":     {"frontend": "React", "backend": "Spring Boot", "database": "PostgreSQL", "cloud": "AWS"},
    "banking":     {"frontend": "Angular","backend": ".NET",       "database": "SQL Server", "cloud": "Azure"},
    "real-time":   {"frontend": "React", "backend": "Node.js",     "database": "Redis",      "cloud": "AWS"},
    "ml":          {"frontend": "React", "backend": "FastAPI",     "database": "PostgreSQL", "cloud": "AWS"},
    "mobile":      {"frontend": "React", "backend": "Node.js",     "database": "MongoDB",    "cloud": "AWS"},
}

_FALLBACK: dict[str, str] = {
    "frontend": "React",
    "backend": ".NET",
    "database": "PostgreSQL",
    "cloud": "Azure",
}


def _build_layer_freq(records: list[dict[str, Any]]) -> dict[str, Counter]:
    freq: dict[str, Counter] = {layer: Counter() for layer in _TECH_LAYERS}
    for rec in records:
        text = " ".join(filter(None, [
            rec.get("search_text") or "",
            " ".join(rec.get("topics", [])) if isinstance(rec.get("topics"), list) else "",
            rec.get("description") or "",
        ])).lower()
        for layer, options in _TECH_LAYERS.items():
            for tech, keywords in options.items():
                if any(kw in text for kw in keywords):
                    freq[layer][tech] += 1
    return freq


def recommend_architecture(requirement: str) -> dict[str, str]:
    req = requirement.lower()

    # Domain shortcut: deterministic answer for known domains
    for domain, stack in _DOMAIN_STACKS.items():
        if domain in req:
            return stack

    # Corpus-derived: pick highest frequency tech per layer
    if PROCESSED_REPOSITORIES_JSON.exists():
        with PROCESSED_REPOSITORIES_JSON.open("r", encoding="utf-8") as fh:
            records: list[dict[str, Any]] = json.load(fh)
        freq = _build_layer_freq(records)
        result: dict[str, str] = {}
        for layer in ("frontend", "backend", "database", "cloud"):
            result[layer] = freq[layer].most_common(1)[0][0] if freq[layer] else _FALLBACK[layer]
        return result

    return _FALLBACK.copy()


def main() -> None:
    parser = argparse.ArgumentParser(description="Architecture Recommendation Engine")
    parser.add_argument("--requirement", default="Need Insurance Claims Platform")
    args = parser.parse_args()

    result = recommend_architecture(args.requirement)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
