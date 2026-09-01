"""
Identify which repository files most likely caused a search match.

Combines semantic embedding similarity (file path + inferred capability label
vs. the requirement) with keyword boosting (exact/substring token overlap) to
score and rank files, then returns the top 10 with a human-readable reason.
"""

import logging
import re
from typing import Any

import numpy as np
from sentence_transformers import SentenceTransformer

from .repository_intelligence import classify_file

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"
TOP_N = 10
SEMANTIC_WEIGHT = 0.7
KEYWORD_WEIGHT = 0.3

_model: SentenceTransformer | None = None

_STOP_WORDS = {
    "the", "and", "for", "with", "from", "into", "using", "build", "create",
    "need", "that", "this", "will", "should", "project", "application",
    "platform", "system", "have", "want", "implement", "support", "based", "in",
}


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


# ── Helpers ───────────────────────────────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    tokens = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower()).split()
    return [t for t in tokens if len(t) > 2 and t not in _STOP_WORDS]


def _file_tokens(path: str) -> list[str]:
    """Split a file path into human-readable tokens (camelCase / snake_case / path segments)."""
    normalized = path.replace("\\", "/")
    segments = re.split(r"[/_\-.]", normalized)
    tokens: list[str] = []
    for segment in segments:
        # split camelCase / PascalCase
        words = re.findall(r"[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])", segment)
        tokens.extend(w.lower() for w in words if len(w) > 1)
    return tokens


def _file_signal_text(path: str) -> str:
    """Build a natural-language-ish description of a file for embedding purposes."""
    label = classify_file(path)
    tokens = " ".join(_file_tokens(path))
    return f"{tokens} {label}" if label else tokens


def _keyword_boost(requirement_keywords: set[str], file_tokens: list[str]) -> float:
    if not requirement_keywords:
        return 0.0
    overlap = requirement_keywords.intersection(file_tokens)
    return min(1.0, len(overlap) / max(1, len(requirement_keywords)))


def _reason(path: str, requirement_keywords: set[str], file_tokens: list[str]) -> str:
    label = classify_file(path)
    overlap = sorted(requirement_keywords.intersection(file_tokens))

    if label and overlap:
        return f"Contains {label.lower()} logic matching keywords: {', '.join(overlap)}"
    if label:
        return f"Contains {label.lower()} implementation"
    if overlap:
        return f"Matches requirement keywords: {', '.join(overlap)}"
    return "Semantically related to the requirement"


# ── Public API ────────────────────────────────────────────────────────────────

def match_files(
    requirement: str,
    repository: dict[str, Any],
    files: list[str] | None = None,
    top_n: int = TOP_N,
) -> dict[str, Any]:
    """
    Score and rank repository files by relevance to the requirement.

    Args:
        requirement: user's natural-language requirement.
        repository:  repository metadata dict (used for fallback file list).
        files:       explicit file list override; defaults to repository["files"].
        top_n:       number of top matches to return.

    Returns:
        {"matchedFiles": [{"path": str, "score": int, "reason": str}, ...]}
    """
    candidate_files = files if files is not None else repository.get("files", [])
    if not candidate_files:
        return {"matchedFiles": []}

    requirement_keywords = set(_tokenize(requirement))

    model = _get_model()
    requirement_vec = np.array(model.encode([requirement], normalize_embeddings=True), dtype=np.float32)[0]

    signals = [_file_signal_text(path) for path in candidate_files]
    file_vecs = np.array(model.encode(signals, normalize_embeddings=True), dtype=np.float32)

    # cosine similarity (vectors already normalized) -> dot product, mapped [-1,1] to [0,100]
    similarities = file_vecs @ requirement_vec
    semantic_scores = np.clip((similarities + 1.0) / 2.0 * 100.0, 0.0, 100.0)

    scored: list[tuple[str, float, str]] = []
    for path, semantic_score in zip(candidate_files, semantic_scores):
        tokens = _file_tokens(path)
        boost = _keyword_boost(requirement_keywords, tokens) * 100.0
        final_score = (semantic_score * SEMANTIC_WEIGHT) + (boost * KEYWORD_WEIGHT)
        reason = _reason(path, requirement_keywords, tokens)
        scored.append((path, final_score, reason))

    scored.sort(key=lambda item: item[1], reverse=True)
    top = scored[:top_n]

    logger.info("Matched %d/%d files for requirement", len(top), len(candidate_files))

    return {
        "matchedFiles": [
            {"path": path, "score": round(score), "reason": reason}
            for path, score, reason in top
        ]
    }


def main() -> None:
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Match repository files against a requirement")
    parser.add_argument("--requirement", required=True)
    parser.add_argument("--repository-file", required=True, help="Path to a JSON repository object")
    parser.add_argument("--top-n", type=int, default=TOP_N)
    args = parser.parse_args()

    with open(args.repository_file, encoding="utf-8") as fh:
        repository = json.load(fh)

    result = match_files(args.requirement, repository, top_n=args.top_n)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
