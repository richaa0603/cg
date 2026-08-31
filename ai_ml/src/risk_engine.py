"""Delivery Risk Engine — Phase 2 Module 4.

Gap-analysis: identifies missing components and structural risks
from requirement intent, returning plain risk strings.
"""
import argparse
import json

from .config import COMPONENTS_JSON

# Domain → components that MUST be present; absence becomes a risk
_EXPECTED: dict[str, list[str]] = {
    "attendance": ["RBAC", "Attendance Service", "Audit Logging", "Notification Service", "Reporting Engine", "Scheduler"],
    "insurance":  ["RBAC", "Workflow Engine", "Audit Logging", "File Storage", "Notification Service", "Reporting Engine"],
    "claims":     ["RBAC", "Workflow Engine", "Audit Logging", "File Storage", "Notification Service", "Reporting Engine"],
    "payroll":    ["RBAC", "Scheduler", "Reporting Engine", "Audit Logging", "Notification Service"],
    "hr":         ["RBAC", "Attendance Service", "Audit Logging", "Reporting Engine", "Notification Service"],
    "project":    ["RBAC", "Workflow Engine", "Reporting Engine", "Notification Service", "File Storage"],
    "consulting": ["RBAC", "Reporting Engine", "Workflow Engine", "Notification Service", "Audit Logging"],
    "management": ["RBAC", "Audit Logging", "Reporting Engine", "Workflow Engine"],
}

# Component name → risk string shown in output
_COMPONENT_RISK: dict[str, str] = {
    "RBAC":                "Missing RBAC",
    "Audit Logging":       "Missing Audit Logging",
    "Notification Service":"No Notification Strategy",
    "Workflow Engine":     "No Workflow / Approval Strategy",
    "Scheduler":           "No Retry / Scheduler Strategy",
    "Reporting Engine":    "Missing Reporting Layer",
    "File Storage":        "No File Storage Strategy",
    "API Gateway":         "No API Gateway / Rate Limiting",
    "Attendance Service":  "Missing Attendance Domain Service",
}

# Keyword → structural risk string
_KEYWORD_RISKS: list[tuple[str, str]] = [
    ("real-time",    "No WebSocket / Real-Time Strategy"),
    ("legacy",       "Legacy System Integration Risk"),
    ("compliance",   "Missing Compliance Controls"),
    ("pii",          "PII Data Governance Not Defined"),
    ("health",       "Healthcare Data Compliance Risk"),
    ("finance",      "Financial Audit Trail Gap"),
    ("bank",         "Banking Regulatory Compliance Gap"),
    ("payment",      "Payment Security (PCI-DSS) Not Addressed"),
    ("multi-tenant", "Multi-Tenancy Isolation Not Specified"),
    ("mobile",       "Mobile API Contract Not Defined"),
    ("offline",      "Offline Sync Strategy Missing"),
    ("import",       "Bulk Import Validation Strategy Missing"),
]

_UNIVERSAL_FALLBACK = [
    "No Retry / Scheduler Strategy",
    "No API Gateway / Rate Limiting",
    "Missing Error Handling Strategy",
]


def _present_components() -> set[str]:
    if not COMPONENTS_JSON.exists():
        return set()
    with COMPONENTS_JSON.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    return {entry["name"] for entry in data.get("components", [])}


def recommend_risks(requirement: str) -> list[str]:
    req = requirement.lower()
    risks: list[str] = []

    # Collect expected components for detected domains
    expected: list[str] = []
    for domain, comps in _EXPECTED.items():
        if domain in req:
            for comp in comps:
                if comp not in expected:
                    expected.append(comp)

    if not expected:
        expected = ["RBAC", "Audit Logging", "Notification Service"]

    present = _present_components()
    for comp in expected:
        if comp not in present:
            risk = _COMPONENT_RISK.get(comp, f"Missing {comp}")
            if risk not in risks:
                risks.append(risk)

    for kw, risk in _KEYWORD_RISKS:
        if kw in req and risk not in risks:
            risks.append(risk)

    # Ensure a minimum useful output
    for fallback in _UNIVERSAL_FALLBACK:
        if len(risks) >= 3:
            break
        if fallback not in risks:
            risks.append(fallback)

    return risks


# Keep legacy alias used by older inference.py callers
def infer_risks(requirement: str):
    return {"risks": [{"title": r, "severity": "medium", "mitigation": ""} for r in recommend_risks(requirement)]}


def main() -> None:
    parser = argparse.ArgumentParser(description="Delivery Risk Engine")
    parser.add_argument("--requirement", default="Need Attendance Management Platform")
    args = parser.parse_args()

    result = recommend_risks(args.requirement)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
