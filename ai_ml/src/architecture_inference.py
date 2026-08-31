# Delegates to the production architecture.py module.
from typing import Any

from .architecture import recommend_architecture


def infer_architecture(requirement: str, stack_hint: str = "web") -> dict[str, Any]:
    return recommend_architecture(requirement)
