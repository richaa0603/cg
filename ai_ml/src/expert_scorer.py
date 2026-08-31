# Delegates to the production experts.py module.
from typing import Any

from .experts import build_expert_profiles, recommend_experts, save_experts  # noqa: F401


def score_experts(records: list[dict[str, Any]]) -> dict[str, Any]:
    # Legacy stub: returns an empty dict; use experts.py directly for real data.
    return {"experts": []}
