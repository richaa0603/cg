"""
Production pipeline to build the enterprise repository search index.

Steps:
  1. Sync repositories from the .NET backend (repository_sync.py)
  2. Analyze each repository (repository_analyzer.py) — technologies, features, files
  3. Build a searchable text corpus per repository
  4. Generate sentence-transformer embeddings (incremental — unchanged repos reuse
     their previously computed vector)
  5. Build a FAISS index from the embedding matrix
  6. Persist metadata mappings so FAISS row <-> repository can be resolved later

Outputs:
  ai_ml/data/enterprise_repositories.json   (raw synced repositories)
  ai_ml/data/repository_metadata.json       (FAISS row-aligned metadata)
  ai_ml/artifacts/repository_embeddings.npy (FAISS row-aligned vectors)
  ai_ml/artifacts/faiss_index.bin           (FAISS index)
  ai_ml/artifacts/index_state.json          (content hashes for incremental rebuilds)
"""

import asyncio
import hashlib
import json
import logging
from typing import Any

import numpy as np
from sentence_transformers import SentenceTransformer

from .config import EMBEDDINGS_NPY, INDEX_STATE_JSON, REPOSITORY_METADATA_JSON
from .faiss_indexer import create_index, save_index
from .repository_analyzer import analyze_repository
from .repository_sync import sync_repositories

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


# ── Corpus construction ───────────────────────────────────────────────────────

def _repo_key(repo: dict[str, Any]) -> str:
    return str(repo.get("repositoryId", repo.get("repositoryName", "")))


def _build_search_text(repo: dict[str, Any], analysis: dict[str, Any]) -> str:
    """Concatenate all searchable signals for a repository into one text blob."""
    parts = [
        repo.get("repositoryName", ""),
        repo.get("description", ""),
        repo.get("language", ""),
        " ".join(analysis.get("technologies", [])),
        " ".join(analysis.get("features", [])),
        " ".join(analysis.get("domain_keywords", [])),
        (repo.get("readme", "") or "")[:2000],
    ]
    return " ".join(p for p in parts if p)


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ── State (for incremental rebuilds) ──────────────────────────────────────────

def _load_state() -> dict[str, dict[str, Any]]:
    if not INDEX_STATE_JSON.exists():
        return {}
    with INDEX_STATE_JSON.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _save_state(state: dict[str, dict[str, Any]]) -> None:
    INDEX_STATE_JSON.parent.mkdir(parents=True, exist_ok=True)
    with INDEX_STATE_JSON.open("w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2)


def _load_previous_vectors() -> np.ndarray | None:
    if not EMBEDDINGS_NPY.exists():
        return None
    return np.load(EMBEDDINGS_NPY).astype(np.float32)


# ── Pipeline ──────────────────────────────────────────────────────────────────

async def build_enterprise_index(force_rebuild: bool = False) -> dict[str, Any]:
    """
    Run the full sync → analyze → embed → index pipeline.

    When force_rebuild is False (default), unchanged repositories reuse their
    previously computed embedding vector instead of being re-encoded.
    """
    # Step 1: sync
    repositories = await sync_repositories()
    logger.info("Synced %d repositories", len(repositories))

    # Step 2 + 3: analyze & build corpus
    enriched: list[dict[str, Any]] = []
    search_texts: list[str] = []
    hashes: list[str] = []

    for repo in repositories:
        analysis = analyze_repository(repo)
        text = _build_search_text(repo, analysis)
        enriched.append({**repo, **analysis})
        search_texts.append(text)
        hashes.append(_content_hash(text))

    # Step 4: incremental embedding generation
    previous_state = {} if force_rebuild else _load_state()
    previous_vectors = None if force_rebuild else _load_previous_vectors()

    to_encode_indices: list[int] = []
    vectors: list[np.ndarray | None] = [None] * len(repositories)

    for i, repo in enumerate(repositories):
        key = _repo_key(repo)
        cached = previous_state.get(key)
        if (
            cached
            and cached.get("hash") == hashes[i]
            and previous_vectors is not None
            and cached.get("row", -1) < previous_vectors.shape[0]
        ):
            vectors[i] = previous_vectors[cached["row"]]
        else:
            to_encode_indices.append(i)

    if to_encode_indices:
        model = _get_model()
        new_vectors = model.encode(
            [search_texts[i] for i in to_encode_indices],
            show_progress_bar=True,
            normalize_embeddings=True,
        )
        for offset, idx in enumerate(to_encode_indices):
            vectors[idx] = np.array(new_vectors[offset], dtype=np.float32)

    logger.info(
        "Embeddings: %d reused, %d newly computed",
        len(repositories) - len(to_encode_indices), len(to_encode_indices),
    )

    if not vectors or any(v is None for v in vectors):
        embedding_matrix = np.zeros((0, 384), dtype=np.float32)
    else:
        embedding_matrix = np.vstack(vectors).astype(np.float32)

    # Step 5: build + save FAISS index
    EMBEDDINGS_NPY.parent.mkdir(parents=True, exist_ok=True)
    np.save(EMBEDDINGS_NPY, embedding_matrix)

    if embedding_matrix.shape[0] > 0:
        index = create_index(embedding_matrix)
        save_index(index)
    else:
        logger.warning("No embeddings generated — skipping FAISS index build")

    # Step 6: save metadata mappings (row-aligned with embedding_matrix)
    metadata: list[dict[str, Any]] = []
    new_state: dict[str, dict[str, Any]] = {}

    for i, repo in enumerate(repositories):
        metadata.append(
            {
                "id": i,
                "repositoryId": repo.get("repositoryId", ""),
                "repository": repo.get("repositoryName", ""),
                "description": repo.get("description", ""),
                "language": repo.get("language", "Unknown"),
                "stars": int(repo.get("stars", 0) or 0),
                "url": repo.get("url", repo.get("html_url", "")),
                "html_url": repo.get("url", repo.get("html_url", "")),
                "source": repo.get("source", "GitHub"),
                "files": repo.get("files", []),
                "technologies": enriched[i].get("technologies", []),
                "features": enriched[i].get("features", []),
                "important_files": enriched[i].get("important_files", []),
            }
        )
        new_state[_repo_key(repo)] = {"hash": hashes[i], "row": i}

    REPOSITORY_METADATA_JSON.parent.mkdir(parents=True, exist_ok=True)
    with REPOSITORY_METADATA_JSON.open("w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=2, ensure_ascii=False)

    _save_state(new_state)

    summary = {
        "total_repositories": len(repositories),
        "embeddings_reused": len(repositories) - len(to_encode_indices),
        "embeddings_computed": len(to_encode_indices),
        "index_size": int(embedding_matrix.shape[0]),
    }
    logger.info("Enterprise index build complete: %s", summary)
    return summary


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Build the enterprise repository FAISS index")
    parser.add_argument("--force", action="store_true", help="Ignore cached embeddings and re-encode everything")
    args = parser.parse_args()

    summary = asyncio.run(build_enterprise_index(force_rebuild=args.force))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
