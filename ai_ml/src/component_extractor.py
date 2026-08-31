# Delegates to the production components.py module.
from typing import Any

from .components import build_component_frequency, recommend_components, save_components  # noqa: F401


def extract_components_from_records(records: list[dict[str, Any]]) -> dict[str, Any]:
    freq = build_component_frequency(records)
    return {"components": [{"name": n, "frequency": c} for n, c in freq.most_common()]}
