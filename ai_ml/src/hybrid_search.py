"""
Hybrid search pipeline:
  Requirement → OpenAI query expansion → FAISS → top-50 candidates
  → repository analysis → OpenAI reranking → org-priority scoring → top-10
"""

import asyncio
import json
import logging
from typing import Any

import numpy as np
from sentence_transformers import SentenceTransformer

from .config import FAISS_INDEX_BIN, REPOSITORY_METADATA_JSON
from .faiss_indexer import load_index
from .openai_ranker import expand_query, generate_explanation, rerank_candidates
from .repository_analyzer import analyze_repository

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None
_MODEL_NAME = "all-MiniLM-L6-v2"
_FAISS_POOL = 50    # candidates retrieved from FAISS
_TOP_K = 10         # final results returned


# ── Shared model ──────────────────────────────────────────────────────────────

def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(_MODEL_NAME)
    return _model


# ── FAISS layer ───────────────────────────────────────────────────────────────

def _load_metadata() -> list[dict[str, Any]]:
    if not REPOSITORY_METADATA_JSON.exists():
        return []
    with REPOSITORY_METADATA_JSON.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _faiss_search(query_text: str, top_k: int) -> list[tuple[dict[str, Any], float]]:
    """
    Encode query_text and search the FAISS index.

    Returns list of (repository_metadata, semantic_score_0_to_100).
    """
    if not FAISS_INDEX_BIN.exists():
        logger.warning("FAISS index not found at %s", FAISS_INDEX_BIN)
        return []

    metadata = _load_metadata()
    if not metadata:
        return []

    model = _get_model()
    query_vec = np.array(
        model.encode([query_text], normalize_embeddings=True), dtype=np.float32
    )

    index = load_index()
    distances, indices = index.search(query_vec, top_k)

    results: list[tuple[dict[str, Any], float]] = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < 0 or idx >= len(metadata):
            continue
        # Cosine similarity in [-1, 1] → [0, 100]
        score = float(max(0.0, min(100.0, ((float(dist) + 1.0) / 2.0) * 100.0)))
        results.append((metadata[int(idx)], score))

    return results


# ── Scoring ───────────────────────────────────────────────────────────────────

def _org_bonus(repo: dict[str, Any]) -> float:
    """100 for internal organisation repositories, 0 for public GitHub repos."""
    return 100.0 if str(repo.get("source", "")).lower() == "organization" else 0.0


def _final_score(semantic: float, llm: float, org: float) -> float:
    """
    Hybrid ranking formula:
        final = (semantic × 0.4) + (llm × 0.5) + (org_bonus × 0.1)
    """
    return (semantic * 0.4) + (llm * 0.5) + (org * 0.1)


# ── Public API ────────────────────────────────────────────────────────────────

async def search(requirement: str) -> list[dict[str, Any]]:
    """
    Full hybrid search pipeline.

    Steps:
      1. Expand requirement with OpenAI
      2. Search FAISS for top-50 candidates
      3. Analyze each candidate (heuristic NLP)
      4. Rerank candidates with OpenAI
      5. Compute final score with org-priority bonus
      6. Generate explanations for top-10 (concurrent)
      7. Return top-10 structured results

    Each result shape:
        {
            "repositoryName": str,
            "source":         str,   # "organization" | "GitHub"
            "score":          int,   # 0–100
            "language":       str,
            "stars":          int,
            "url":            str,
            "matchedFiles":   list[str],
            "explanation":    str,
            "matchedCapabilities": list[str],
        }
    """
    # ── Step 1: query expansion ───────────────────────────────────────────────
    try:
        expanded = await expand_query(requirement)
        search_query = " ".join(expanded.keywords) if expanded.keywords else requirement
        logger.info("Expanded query: %s", search_query)
    except Exception:
        logger.warning("OpenAI query expansion failed; falling back to raw requirement")
        search_query = requirement

    # ── Step 2: FAISS retrieval ───────────────────────────────────────────────
    faiss_results = _faiss_search(search_query, _FAISS_POOL)
    if not faiss_results:
        logger.warning("FAISS returned no results")
        return []

    # ── Step 3: enrich candidates with heuristic analysis ────────────────────
    candidates: list[dict[str, Any]] = []
    semantic_map: dict[str, float] = {}

    for repo_meta, sem_score in faiss_results:
        name = repo_meta.get("repository", repo_meta.get("name", ""))
        analysis = analyze_repository(repo_meta)
        enriched = {
            **repo_meta,
            "repositoryName": name,
            "technologies":   analysis["technologies"],
            "features":       analysis["features"],
            "important_files": analysis["important_files"],
        }
        candidates.append(enriched)
        semantic_map[name] = sem_score

    # ── Step 4: OpenAI reranking ──────────────────────────────────────────────
    llm_map: dict[str, tuple[int, str]] = {}
    try:
        ranked = await rerank_candidates(requirement, candidates)
        llm_map = {r.repository: (r.score, r.reason) for r in ranked}
    except Exception:
        logger.warning("OpenAI reranking failed; using semantic scores only")

    # ── Step 5: compute final scores ─────────────────────────────────────────
    scored: list[tuple[dict[str, Any], float, int, str]] = []
    for candidate in candidates:
        name = candidate["repositoryName"]
        sem = semantic_map.get(name, 0.0)
        llm_score, llm_reason = llm_map.get(name, (round(sem), "Semantic similarity match"))
        bonus = _org_bonus(candidate)
        score = _final_score(sem, float(llm_score), bonus)
        scored.append((candidate, score, llm_score, llm_reason))

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:_TOP_K]

    # ── Step 6: generate explanations concurrently ────────────────────────────
    try:
        explanations = await asyncio.gather(
            *[generate_explanation(requirement, c) for c, *_ in top],
            return_exceptions=True,
        )
    except Exception:
        explanations = [None] * len(top)

    # ── Step 7: build response ────────────────────────────────────────────────
    results: list[dict[str, Any]] = []
    for i, (candidate, final, _llm, llm_reason) in enumerate(top):
        exp = explanations[i] if i < len(explanations) else None

        if exp and not isinstance(exp, Exception):
            explanation_text = exp.explanation
            capabilities = exp.matched_capabilities
        else:
            explanation_text = llm_reason
            capabilities = candidate.get("features", [])[:5]

        results.append({
            "repositoryName":      candidate.get("repositoryName", ""),
            "source":              candidate.get("source", "GitHub"),
            "score":               round(final),
            "language":            candidate.get("language", "Unknown"),
            "stars":               candidate.get("stars", 0),
            "url":                 candidate.get("html_url", candidate.get("url", "")),
            "matchedFiles":        candidate.get("important_files", []),
            "explanation":         explanation_text,
            "matchedCapabilities": capabilities,
        })

    return results
