"""
Rank fusion for hybrid repository search — organization-first strategy.

Search order:
  1. Organization repositories are scored first.
  2. Public GitHub repositories are scored second.

Promotion rules:
  - If an organization repository scores >= 75, it is promoted above all
    GitHub results (organization-first placement).
  - If no organization repository scores >= 60, GitHub results are allowed to
    dominate — the list is ranked purely by score, with no organization boost.
  - Otherwise (some org score in [60, 75)), all candidates are ranked purely
    by score — organization repositories compete on merit only.

Scoring formula (per candidate):
    effective_score = semantic_score * 0.4 + llm_score * 0.5 + source_bonus * 0.1

Where source_bonus = 100 for organization repositories, 0 for GitHub (or any
other external source).
"""

import logging
from typing import Any

logger = logging.getLogger(__name__)

SEMANTIC_WEIGHT = 0.4
LLM_WEIGHT = 0.5
SOURCE_BONUS_WEIGHT = 0.1
SOURCE_BONUS_VALUE = 100.0

PROMOTION_THRESHOLD = 75.0   # org score at/above this is promoted above GitHub
DOMINANCE_THRESHOLD = 60.0   # if no org scores at/above this, GitHub may dominate freely

_ORGANIZATION_SOURCES = {"organization", "org"}


def _repo_key(candidate: dict[str, Any]) -> str:
    return str(candidate.get("repositoryId", candidate.get("repositoryName", candidate.get("repository", ""))))


def _is_organization(source: str) -> bool:
    return str(source).strip().lower() in _ORGANIZATION_SOURCES


def _source_bonus(source: str) -> float:
    """100 for organization repositories, 0 for public GitHub / other sources."""
    return SOURCE_BONUS_VALUE if _is_organization(source) else 0.0


def _score_candidate(candidate: dict[str, Any], llm_scores: dict[str, tuple[int, str]]) -> dict[str, Any]:
    key = _repo_key(candidate)
    semantic_score = float(candidate.get("semantic_score", 0.0))
    source = candidate.get("source", "GitHub")

    llm_score, reason = llm_scores.get(key, (round(semantic_score), "Semantic similarity match"))
    bonus = _source_bonus(source)
    effective_score = (semantic_score * SEMANTIC_WEIGHT) + (float(llm_score) * LLM_WEIGHT) + (bonus * SOURCE_BONUS_WEIGHT)

    return {
        **candidate,
        "semantic_score": round(semantic_score),
        "llm_score": int(llm_score),
        "source_bonus": bonus,
        "effective_score": round(effective_score, 2),
        "score": round(effective_score),   # convenience alias for UI consumers
        "reason": reason,
    }


def fuse_and_rank(
    org_candidates: list[dict[str, Any]],
    github_candidates: list[dict[str, Any]],
    llm_scores: dict[str, tuple[int, str]],
    top_k: int = 10,
) -> list[dict[str, Any]]:
    """
    Fuse organization + GitHub candidates with OpenAI relevance scores, applying
    the organization-first promotion/dominance rules described above.

    Args:
        org_candidates:    repositories from the enterprise/organization index.
                           Each item must include repositoryName/repositoryId,
                           a 'semantic_score' (0-100), and 'source' (e.g. "organization").
        github_candidates: repositories from the public GitHub search, same shape,
                           with 'source' typically "GitHub".
        llm_scores:        mapping of repository key -> (llm_score 0-100, reason).
        top_k:             number of results to return.

    Returns:
        Top-ranked repositories, each annotated with:
        effective_score, semantic_score, llm_score, source_bonus, reason.
    """
    # Step 1: organization repositories scored first.
    scored_org = [_score_candidate(c, llm_scores) for c in org_candidates]
    # Step 2: GitHub repositories scored second.
    scored_github = [_score_candidate(c, llm_scores) for c in github_candidates]

    scored_org.sort(key=lambda r: r["effective_score"], reverse=True)
    scored_github.sort(key=lambda r: r["effective_score"], reverse=True)

    best_org_score = scored_org[0]["effective_score"] if scored_org else 0.0

    if best_org_score >= PROMOTION_THRESHOLD:
        # Promote qualifying org results above every GitHub result.
        promoted = [r for r in scored_org if r["effective_score"] >= PROMOTION_THRESHOLD]
        remaining = [r for r in scored_org if r["effective_score"] < PROMOTION_THRESHOLD] + scored_github
        remaining.sort(key=lambda r: r["effective_score"], reverse=True)
        ranked = promoted + remaining
        logger.info("Promotion rule applied: %d organization result(s) promoted above GitHub", len(promoted))

    elif best_org_score < DOMINANCE_THRESHOLD:
        # No organization result is strong enough — let GitHub dominate on merit.
        ranked = scored_org + scored_github
        ranked.sort(key=lambda r: r["effective_score"], reverse=True)
        logger.info("Dominance rule applied: no organization result >= %.0f, ranking purely by score", DOMINANCE_THRESHOLD)

    else:
        # Middle ground: rank purely by merit, no promotion or suppression.
        ranked = scored_org + scored_github
        ranked.sort(key=lambda r: r["effective_score"], reverse=True)

    top = ranked[:top_k]

    logger.info(
        "Rank fusion: %d org + %d github candidates -> top %d (best effective_score %s)",
        len(org_candidates), len(github_candidates), len(top),
        top[0]["effective_score"] if top else "n/a",
    )

    return top


def main() -> None:
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Fuse organization and GitHub search results")
    parser.add_argument("--org-file", required=True, help="Path to a JSON file of org candidates")
    parser.add_argument("--github-file", required=True, help="Path to a JSON file of GitHub candidates")
    parser.add_argument("--llm-scores-file", required=True, help="Path to a JSON file mapping repo key -> [score, reason]")
    parser.add_argument("--top-k", type=int, default=10)
    args = parser.parse_args()

    with open(args.org_file, encoding="utf-8") as fh:
        org_candidates = json.load(fh)
    with open(args.github_file, encoding="utf-8") as fh:
        github_candidates = json.load(fh)
    with open(args.llm_scores_file, encoding="utf-8") as fh:
        raw_scores = json.load(fh)
        llm_scores = {k: (v[0], v[1]) for k, v in raw_scores.items()}

    results = fuse_and_rank(org_candidates, github_candidates, llm_scores, top_k=args.top_k)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
