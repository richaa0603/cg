"""Component Recommendation Engine — Phase 2 Module 1."""
import argparse
import json
from collections import Counter
from typing import Any

from .config import COMPONENTS_JSON, PROCESSED_REPOSITORIES_JSON

# Canonical component catalog: display name → detection keywords
COMPONENT_CATALOG: dict[str, list[str]] = {
    "Authentication": ["auth", "oauth", "jwt", "login", "sso", "saml", "keycloak", "passport", "session", "token"],
    "RBAC": ["rbac", "role", "permission", "acl", "access control", "authorization", "policy"],
    "Attendance Service": ["attendance", "check-in", "check-out", "biometric", "timesheet", "clock", "leave"],
    "Notification Service": ["notification", "email", "sms", "push", "alert", "webhook", "notify"],
    "Audit Logging": ["audit", "log", "trail", "history", "changelog", "activity"],
    "Reporting Engine": ["report", "dashboard", "analytics", "chart", "export", "pdf", "insight", "visualization"],
    "File Storage": ["upload", "file", "blob", "s3", "storage", "document", "attachment", "media"],
    "Search Service": ["search", "elasticsearch", "opensearch", "solr", "full-text", "query"],
    "Workflow Engine": ["workflow", "bpmn", "approval", "process", "orchestration", "pipeline"],
    "API Gateway": ["gateway", "proxy", "rate limit", "throttle", "ingress", "kong", "nginx"],
    "User Management": ["user", "profile", "account", "employee", "member", "directory", "ldap"],
    "Scheduler": ["scheduler", "cron", "schedule", "timer", "recurring", "quartz", "celery"],
}

# Domain → ordered priority list of expected components
_DOMAIN_PRIORITIES: dict[str, list[str]] = {
    "attendance": ["Authentication", "RBAC", "Attendance Service", "Notification Service", "Audit Logging", "Reporting Engine", "Scheduler"],
    "insurance": ["Authentication", "RBAC", "Workflow Engine", "Audit Logging", "File Storage", "Notification Service", "Reporting Engine"],
    "claims": ["Authentication", "RBAC", "Workflow Engine", "Audit Logging", "File Storage", "Notification Service", "Reporting Engine"],
    "payroll": ["Authentication", "RBAC", "Scheduler", "Reporting Engine", "Audit Logging", "Notification Service"],
    "hr": ["Authentication", "RBAC", "Attendance Service", "User Management", "Reporting Engine", "Notification Service", "Audit Logging"],
    "consulting": ["Authentication", "RBAC", "Reporting Engine", "Workflow Engine", "Notification Service", "User Management"],
    "project": ["Authentication", "RBAC", "Workflow Engine", "Reporting Engine", "Notification Service", "Scheduler", "File Storage"],
    "management": ["Authentication", "RBAC", "User Management", "Reporting Engine", "Workflow Engine", "Audit Logging"],
}


def build_component_frequency(records: list[dict[str, Any]]) -> Counter:
    """Count how many repos in corpus surface each component."""
    freq: Counter = Counter()
    for rec in records:
        corpus = " ".join(filter(None, [
            rec.get("search_text") or "",
            " ".join(rec.get("topics", [])) if isinstance(rec.get("topics"), list) else "",
            rec.get("description") or "",
            (rec.get("readme") or "")[:2000],
        ])).lower()
        for name, keywords in COMPONENT_CATALOG.items():
            if any(kw in corpus for kw in keywords):
                freq[name] += 1
    return freq


def save_components(freq: Counter) -> None:
    payload = {"components": [{"name": name, "frequency": count} for name, count in freq.most_common()]}
    COMPONENTS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with COMPONENTS_JSON.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)


def recommend_components(requirement: str, top_k: int = 10) -> list[str]:
    req = requirement.lower()
    ordered: list[str] = []

    # 1. Domain priority list fills the front of the result
    for domain, components in _DOMAIN_PRIORITIES.items():
        if domain in req:
            for comp in components:
                if comp not in ordered:
                    ordered.append(comp)
            break

    # 2. Direct keyword match in requirement text
    for name, keywords in COMPONENT_CATALOG.items():
        if name not in ordered and any(kw in req for kw in keywords):
            ordered.append(name)

    # 3. Corpus frequency signal fills remaining slots
    if COMPONENTS_JSON.exists():
        with COMPONENTS_JSON.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        for entry in data.get("components", []):
            name = entry["name"]
            if name not in ordered:
                ordered.append(name)

    # Authentication is always required
    if "Authentication" not in ordered:
        ordered.insert(0, "Authentication")

    return ordered[:top_k]


def main() -> None:
    parser = argparse.ArgumentParser(description="Component Recommendation Engine")
    parser.add_argument("--requirement", default="Need Attendance Management System")
    parser.add_argument("--build", action="store_true", help="Rebuild components.json from processed corpus")
    args = parser.parse_args()

    if args.build:
        if not PROCESSED_REPOSITORIES_JSON.exists():
            print(json.dumps({"error": "Run text_processing first to generate processed_repositories.json"}))
            return
        with PROCESSED_REPOSITORIES_JSON.open("r", encoding="utf-8") as fh:
            records = json.load(fh)
        freq = build_component_frequency(records)
        save_components(freq)
        print(json.dumps({"built": True, "component_types": len(freq)}, indent=2))
    else:
        result = recommend_components(args.requirement)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
