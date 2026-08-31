import json
from typing import Any
import argparse

import numpy as np
from sentence_transformers import SentenceTransformer

from .config import FAISS_INDEX_BIN, REPOSITORY_METADATA_JSON
from .faiss_indexer import load_index

MODEL_NAME = "all-MiniLM-L6-v2"
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def _to_percentage(score: float) -> int:
    normalized = (score + 1.0) / 2.0
    return int(max(0, min(100, round(normalized * 100))))


def search_projects(requirement: str, top_k: int = 10) -> list[dict[str, Any]]:
    if not FAISS_INDEX_BIN.exists() or not REPOSITORY_METADATA_JSON.exists():
        return []

    with REPOSITORY_METADATA_JSON.open("r", encoding="utf-8") as file:
        metadata: list[dict[str, Any]] = json.load(file)

    if not metadata:
        return []

    model = _get_model()
    query_vector = model.encode([requirement], normalize_embeddings=True)
    query_vector = np.array(query_vector, dtype=np.float32)

    index = load_index()
    distances, indices = index.search(query_vector, top_k)

    results: list[dict[str, Any]] = []
    for i, idx in enumerate(indices[0]):
        if idx < 0 or idx >= len(metadata):
            continue

        item = metadata[idx]
        results.append(
            {
                "repository": item.get("repository", item.get("name", "")),
                "score": _to_percentage(float(distances[0][i])),
                "language": item.get("language", "Unknown"),
                "stars": item.get("stars", 0),
            }
        )

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Search top similar repositories for a requirement")
    parser.add_argument("--requirement", required=True, help="Requirement text")
    parser.add_argument("--top-k", type=int, default=10, help="Number of results")
    args = parser.parse_args()

    results = search_projects(args.requirement, top_k=args.top_k)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
