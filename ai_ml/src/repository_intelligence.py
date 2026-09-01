"""
Deep, OpenAI-free repository intelligence extraction.

Goes beyond repository_analyzer.py by also inspecting folder structure and by
covering a wider pattern vocabulary for security, database, messaging, and
notification concerns. Pure heuristics/regex — no external API calls.
"""

import re
from typing import Any

# ── File-name pattern registry ────────────────────────────────────────────────
# Ordered by specificity: more specific patterns are listed first so that,
# e.g., "PaymentController.cs" resolves to "Payments" rather than generic "REST API".

_FILE_PATTERNS: list[tuple[re.Pattern, str]] = [
    # Security / authentication
    (re.compile(r"jwt", re.I),                                            "Authentication"),
    (re.compile(r"auth(entication|orize|controller|service|middleware|handler)?", re.I), "Authentication"),
    (re.compile(r"role|rbac|permission|guard|policy|claim|scope", re.I),  "Authorization / RBAC"),
    (re.compile(r"oauth|oidc|saml|sso", re.I),                            "OAuth / SSO"),
    (re.compile(r"password|bcrypt|hash|encrypt|decrypt|aes|rsa|cipher", re.I), "Cryptography"),
    (re.compile(r"apikey|api.key|secret|vault|keyvault", re.I),           "Secrets Management"),

    # Domain / business capability
    (re.compile(r"payment|stripe|paypal|billing|invoice|checkout", re.I), "Payments"),
    (re.compile(r"order|cart|inventory|catalog", re.I),                   "E-commerce"),

    # Messaging / realtime
    (re.compile(r"kafka|rabbitmq|servicebus|sqs|pubsub|eventbus|eventgrid", re.I), "Messaging"),
    (re.compile(r"signalr|websocket|socket\.io|realtime|hub\.cs$|hub\.ts$", re.I), "Realtime"),
    (re.compile(r"queue|producer|consumer|publisher|subscriber", re.I),   "Messaging"),

    # Notifications
    (re.compile(r"notif|email|smtp|sendgrid|twilio|push.?notification", re.I), "Notification Service"),
    (re.compile(r"webhook", re.I),                                        "Webhooks"),

    # Data / persistence
    (re.compile(r"migration|schema|seed|flyway|liquibase", re.I),        "Database Migrations"),
    (re.compile(r"repository|repo|dao|dataaccess|mapper|unitofwork", re.I), "Repository Pattern"),
    (re.compile(r"dbcontext|entity|model|entities", re.I),                "Data Model"),
    (re.compile(r"cache|redis|memcached", re.I),                         "Caching"),

    # API / infra
    (re.compile(r"swagger|openapi", re.I),                                "API Documentation"),
    (re.compile(r"controller|endpoint|route|router|handler", re.I),      "REST API"),
    (re.compile(r"middleware|interceptor|filter|pipeline|decorator", re.I), "Middleware"),
    (re.compile(r"dockerfile|compose|container", re.I),                   "Docker / Containers"),
    (re.compile(r"ci|cd|pipeline|workflow|github.actions|jenkins|build\.ya?ml", re.I), "CI/CD"),
    (re.compile(r"config|settings|appsettings|env|environment", re.I),    "Configuration"),
    (re.compile(r"schedule|cron|job|worker|background", re.I),           "Background Jobs"),
    (re.compile(r"search|index|elastic|solr|faiss|lucene", re.I),        "Search / Indexing"),
    (re.compile(r"audit|trail|activity.?log", re.I),                     "Audit Logging"),
    (re.compile(r"health|probe|liveness|readiness", re.I),               "Health Checks"),
    (re.compile(r"test|spec|mock|fixture|stub|fake", re.I),              "Testing"),
]

# ── Folder-name pattern registry ─────────────────────────────────────────────

_FOLDER_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"^(auth|authentication|identity)$", re.I),  "Authentication"),
    (re.compile(r"^(controllers|api|endpoints)$", re.I),     "REST API"),
    (re.compile(r"^(services|domain|application)$", re.I),   "Business Logic"),
    (re.compile(r"^(repositories|data|persistence|infrastructure)$", re.I), "Data Access"),
    (re.compile(r"^(migrations)$", re.I),                     "Database Migrations"),
    (re.compile(r"^(messaging|events|queues)$", re.I),        "Messaging"),
    (re.compile(r"^(notifications)$", re.I),                  "Notification Service"),
    (re.compile(r"^(middleware|filters|interceptors)$", re.I), "Middleware"),
    (re.compile(r"^(tests?|__tests__|spec)$", re.I),          "Testing"),
    (re.compile(r"^(\.github|ci|pipelines)$", re.I),          "CI/CD"),
    (re.compile(r"^(config|configuration|settings)$", re.I),  "Configuration"),
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
    "Kafka":            [r"\bkafka\b"],
    "SignalR":          [r"\bsignalr\b"],
    "GraphQL":          [r"\bgraphql\b", r"hotchocolate", r"strawberry"],
    "gRPC":             [r"\bgrpc\b", r"\.proto$"],
    "Terraform":        [r"\.tf$", r"\bterraform\b"],
}

# ── Domain keyword vocabulary ─────────────────────────────────────────────────

_DOMAIN_VOCAB: dict[str, list[str]] = {
    "HRMS":                  ["employee", "payroll", "attendance", "leave", "human resource"],
    "Finance":               ["payment", "invoice", "billing", "transaction", "banking"],
    "Healthcare":            ["patient", "health", "medical", "clinical", "hospital", "ehr"],
    "Insurance":             ["claim", "policy", "premium", "insurance", "underwriting"],
    "E-commerce":            ["cart", "product", "order", "checkout", "inventory", "catalog"],
    "CRM":                   ["customer", "crm", "lead", "opportunity", "sales"],
    "Identity Management":   ["identity", "user management", "sso", "directory", "ldap"],
    "Project Management":    ["project", "task", "sprint", "kanban", "milestone"],
    "Content Management":    ["cms", "content", "media", "publishing", "blog"],
    "Delivery Intelligence": ["repository", "consultant", "recommendation", "discovery"],
}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _normalize_path(path: str) -> str:
    return path.replace("\\", "/")


def _stem(file_path: str) -> str:
    name = _normalize_path(file_path).split("/")[-1]
    return re.sub(r"\.[^.]+$", "", name)


def _folder_segments(file_path: str) -> list[str]:
    parts = _normalize_path(file_path).split("/")[:-1]
    return [p for p in parts if p]


def _build_corpus(repository: dict[str, Any]) -> str:
    return " ".join(filter(None, [
        repository.get("repositoryName", ""),
        repository.get("description", ""),
        repository.get("readme", ""),
        repository.get("language", ""),
        " ".join(repository.get("files", [])),
    ])).lower()


def _analyze_files(files: list[str]) -> tuple[list[str], list[str]]:
    """Scan file names for recognised patterns, returning (features, important_files)."""
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
                break

    return features, important


def _analyze_folders(files: list[str]) -> list[str]:
    """Identify meaningful folders and label their architectural role."""
    folder_labels: dict[str, str] = {}

    for path in files:
        for segment in _folder_segments(path):
            for pattern, label in _FOLDER_PATTERNS:
                if pattern.match(segment) and segment not in folder_labels:
                    folder_labels[segment] = label

    return sorted(folder_labels.keys())


def _detect_technologies(repository: dict[str, Any]) -> list[str]:
    corpus = _build_corpus(repository)
    detected: list[str] = []

    for tech, patterns in _TECH_VOCAB.items():
        if any(re.search(p, corpus) for p in patterns):
            detected.append(tech)

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

def classify_file(path: str) -> str | None:
    """Return the first recognised capability label for a single file path, if any."""
    stem = _stem(path)
    for pattern, feature in _FILE_PATTERNS:
        if pattern.search(stem):
            return feature
    return None


def analyze_repository_intelligence(repository: dict[str, Any]) -> dict[str, Any]:
    """
    Extract deep structural intelligence from a repository object.

    Input keys used: repositoryName, description, readme, language, files.

    Returns:
        {
            "technologies":       list[str],
            "features":           list[str],   # security/db/messaging/notification/etc. capabilities
            "important_files":    list[str],
            "important_folders":  list[str],
            "domain_keywords":    list[str],
        }
    """
    files: list[str] = repository.get("files", [])
    features, important_files = _analyze_files(files)

    return {
        "technologies": _detect_technologies(repository),
        "features": features,
        "important_files": important_files,
        "important_folders": _analyze_folders(files),
        "domain_keywords": _detect_domain_keywords(repository),
    }


def main() -> None:
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Extract deep repository intelligence from a JSON repository object")
    parser.add_argument("--file", required=True, help="Path to a JSON file containing a single repository object")
    args = parser.parse_args()

    with open(args.file, encoding="utf-8") as fh:
        repository = json.load(fh)

    print(json.dumps(analyze_repository_intelligence(repository), indent=2))


if __name__ == "__main__":
    main()
