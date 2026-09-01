"""Heuristic + NLP analyzer to extract structured metadata from a repository object."""

import re
from typing import Any

# ── File-name pattern registry ────────────────────────────────────────────────
# Each entry: (compiled_regex, feature_category, label)

_FILE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"jwt", re.I),                                      "Authentication"),
    (re.compile(r"auth(entication|orize|controller|service|middleware|handler)?", re.I), "Authentication"),
    (re.compile(r"role|rbac|permission|guard|policy|claim", re.I),  "Authorization / RBAC"),
    (re.compile(r"oauth|oidc|saml|sso|token", re.I),               "OAuth / SSO"),
    (re.compile(r"password|bcrypt|hash|encrypt|decrypt|aes|rsa", re.I), "Cryptography"),
    (re.compile(r"swagger|openapi", re.I),                          "API Documentation"),
    (re.compile(r"controller|endpoint|route|router|handler", re.I), "REST API"),
    (re.compile(r"repository|repo|dao|dataaccess|mapper", re.I),    "Repository Pattern"),
    (re.compile(r"migration|schema|seed|flyway|liquibase", re.I),   "Database Migrations"),
    (re.compile(r"test|spec|mock|fixture|stub|fake", re.I),         "Testing"),
    (re.compile(r"dockerfile|compose|container", re.I),             "Docker / Containers"),
    (re.compile(r"ci|cd|pipeline|workflow|github.actions|jenkins|build\.ya?ml", re.I), "CI/CD"),
    (re.compile(r"cache|redis|memcached", re.I),                    "Caching"),
    (re.compile(r"message|queue|bus|kafka|rabbitmq|event|pubsub", re.I), "Messaging / Events"),
    (re.compile(r"notif|email|smtp|sendgrid|twilio|webhook", re.I), "Notification Service"),
    (re.compile(r"report|analytics|metric|dashboard|chart", re.I),  "Analytics / Reporting"),
    (re.compile(r"upload|file|blob|storage|s3|bucket", re.I),       "File Storage"),
    (re.compile(r"audit|log|trail|activity", re.I),                 "Audit Logging"),
    (re.compile(r"middleware|interceptor|filter|pipeline|decorator", re.I), "Middleware"),
    (re.compile(r"config|settings|appsettings|env|environment", re.I), "Configuration"),
    (re.compile(r"schedule|cron|job|worker|background", re.I),      "Background Jobs"),
    (re.compile(r"search|index|elastic|solr|faiss|lucene", re.I),   "Search / Indexing"),
    (re.compile(r"graph|neo4j|knowledge", re.I),                    "Knowledge Graph"),
    (re.compile(r"payment|stripe|paypal|billing|invoice", re.I),    "Payments"),
    (re.compile(r"health|probe|liveness|readiness", re.I),          "Health Checks"),
]

# ── Technology detection vocabulary ──────────────────────────────────────────

_TECH_VOCAB: dict[str, list[str]] = {
    ".NET / C#":        [r"\.cs$", r"csproj", r"asp\.net", r"c#", r"blazor", r"\.net"],
    "Java / Spring":    [r"\.java$", r"spring", r"maven", r"gradle", r"hibernate", r"quarkus"],
    "Node.js":          [r"package\.json", r"\bnode\b", r"express", r"nestjs"],
    "TypeScript":       [r"tsconfig", r"\.ts$", r"\.tsx$"],
    "React":            [r"\breact\b", r"\.jsx$", r"next\.js", r"vite"],
    "Angular":          [r"\bangular\b", r"\.component\.ts$", r"ngmodule"],
    "Vue":              [r"\bvue\b", r"\.vue$", r"nuxt"],
    "Python":           [r"\.py$", r"\bdjango\b", r"\bflask\b", r"\bfastapi\b", r"requirements\.txt"],
    "PostgreSQL":       [r"\bpostgres\b", r"\bpg\b", r"\bpsql\b", r"npgsql"],
    "SQL Server":       [r"sqlserver", r"\bmssql\b", r"entityframework"],
    "MongoDB":          [r"\bmongo\b", r"\bmongoose\b"],
    "Redis":            [r"\bredis\b", r"stackexchange\.redis"],
    "Docker":           [r"dockerfile", r"docker-compose"],
    "Kubernetes":       [r"\bk8s\b", r"\bkubernetes\b", r"\bhelm\b"],
    "Azure":            [r"\bazure\b", r"\.bicep$", r"arm template"],
    "AWS":              [r"\baws\b", r"\blambda\b", r"\bs3\b"],
    "JWT":              [r"\bjwt\b", r"\bbearer\b", r"jsonwebtoken", r"system\.identitymodel"],
    "FAISS":            [r"\bfaiss\b"],
    "OpenAI":           [r"\bopenai\b", r"\bgpt\b", r"\bllm\b"],
    "GraphQL":          [r"\bgraphql\b", r"hotchocolate", r"strawberry"],
    "gRPC":             [r"\bgrpc\b", r"\.proto$"],
    "Terraform":        [r"\.tf$", r"\bterraform\b"],
}

# ── Domain keyword vocabulary ─────────────────────────────────────────────────

_DOMAIN_VOCAB: dict[str, list[str]] = {
    "HRMS":                ["employee", "payroll", "attendance", "leave", "human resource"],
    "Finance":             ["payment", "invoice", "billing", "transaction", "banking"],
    "Healthcare":          ["patient", "health", "medical", "clinical", "hospital", "ehr"],
    "Insurance":           ["claim", "policy", "premium", "insurance", "underwriting"],
    "E-commerce":          ["cart", "product", "order", "checkout", "inventory", "catalog"],
    "CRM":                 ["customer", "crm", "lead", "opportunity", "sales"],
    "Identity Management": ["identity", "user management", "sso", "directory", "ldap"],
    "Project Management":  ["project", "task", "sprint", "kanban", "milestone"],
    "Content Management":  ["cms", "content", "media", "publishing", "blog"],
    "Delivery Intelligence": ["repository", "consultant", "recommendation", "discovery"],
}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _stem(file_path: str) -> str:
    """Return the base name of a file path without its extension."""
    name = file_path.replace("\\", "/").split("/")[-1]
    return re.sub(r"\.[^.]+$", "", name)


def _build_corpus(repository: dict[str, Any]) -> str:
    """Concatenate all textual fields of a repository into a single search corpus."""
    return " ".join(filter(None, [
        repository.get("repositoryName", ""),
        repository.get("description", ""),
        repository.get("readme", ""),
        repository.get("language", ""),
        " ".join(repository.get("files", [])),
    ])).lower()


def _analyze_files(files: list[str]) -> tuple[list[str], list[str]]:
    """
    Scan file names for recognised patterns.

    Returns:
        features       – deduplicated list of feature categories in discovery order
        important_files – the first file that triggered each matched feature
    """
    features: list[str] = []
    important: list[str] = []
    seen: set[str] = set()

    for path in files:
        stem = _stem(path)
        for pattern, feature in _FILE_PATTERNS:
            if pattern.search(stem) and feature not in seen:
                seen.add(feature)
                features.append(feature)
                important.append(path)
                break   # one feature per file to avoid over-counting

    return features, important


def _detect_technologies(repository: dict[str, Any]) -> list[str]:
    corpus = _build_corpus(repository)
    detected: list[str] = []

    for tech, patterns in _TECH_VOCAB.items():
        if any(re.search(p, corpus) for p in patterns):
            detected.append(tech)

    # Ensure the declared primary language is always surfaced
    primary = repository.get("language", "")
    if primary and primary not in detected:
        detected.insert(0, primary)

    return detected


def _detect_domain_keywords(repository: dict[str, Any]) -> list[str]:
    corpus = _build_corpus(repository)
    return [
        domain
        for domain, terms in _DOMAIN_VOCAB.items()
        if any(term in corpus for term in terms)
    ]


# ── Public API ────────────────────────────────────────────────────────────────

def analyze_repository(repository: dict[str, Any]) -> dict[str, Any]:
    """
    Extract structured metadata from a repository object.

    Input keys used: repositoryName, description, readme, language, files.

    Returns:
        {
            "technologies":    list[str],   # detected tech stack
            "features":        list[str],   # capabilities inferred from file names
            "important_files": list[str],   # files that triggered each feature
            "domain_keywords": list[str],   # matched business domain labels
        }
    """
    files: list[str] = repository.get("files", [])
    features, important_files = _analyze_files(files)

    return {
        "technologies": _detect_technologies(repository),
        "features": features,
        "important_files": important_files,
        "domain_keywords": _detect_domain_keywords(repository),
    }
