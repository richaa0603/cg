from typing import Any

from .architecture import recommend_architecture as _arch
from .components import recommend_components as _comps
from .experts import recommend_experts as _experts
from .risk_engine import recommend_risks as _risks
from .search_engine import search_projects as _search


def search_projects(requirement: str, top_k: int = 10) -> list[dict[str, Any]]:
    return _search(requirement, top_k=top_k)


def recommend_components(requirement: str) -> dict[str, Any]:
    return {"requirement": requirement, "recommended_components": _comps(requirement)}


def recommend_architecture(requirement: str) -> dict[str, Any]:
    return _arch(requirement)


def recommend_experts(requirement: str, top_k: int = 10) -> dict[str, Any]:
    return {"requirement": requirement, "experts": _experts(requirement, top_k=top_k)}


def recommend_risks(requirement: str) -> dict[str, Any]:
    return {"requirement": requirement, "risks": _risks(requirement)}
