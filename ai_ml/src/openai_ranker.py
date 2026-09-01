"""OpenAI-powered query expansion, candidate reranking, and match explanation."""

import json
import logging
import os
from typing import Any

from openai import AsyncOpenAI
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY environment variable is not set")
        _client = AsyncOpenAI(api_key=api_key)
    return _client


# ── Pydantic models ───────────────────────────────────────────────────────────

class ExpandedQuery(BaseModel):
    keywords: list[str] = Field(..., description="Technical keywords extracted from the requirement")


class RankedRepository(BaseModel):
    repository: str
    score: int = Field(..., ge=0, le=100)
    reason: str


class RepositoryExplanation(BaseModel):
    repository: str
    explanation: str
    matched_capabilities: list[str]


# ── Public API ────────────────────────────────────────────────────────────────

async def expand_query(requirement: str) -> ExpandedQuery:
    """
    Expand a requirement string into technical search keywords.

    Input : "Need JWT Authentication with RBAC in ASP.NET Core"
    Output: ExpandedQuery(keywords=["jwt", "authentication", "rbac", ...])
    """
    client = _get_client()

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a software architecture expert. "
                    "Extract concise, specific technical keywords from the given requirement. "
                    "Return only a JSON object with a 'keywords' array of lowercase strings. "
                    "Include technology names, design patterns, and domain terms. "
                    "Limit to 8 keywords."
                ),
            },
            {"role": "user", "content": f"Requirement: {requirement}"},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    content = response.choices[0].message.content or "{}"
    data = json.loads(content)
    return ExpandedQuery(keywords=data.get("keywords", []))


async def rerank_candidates(
    requirement: str,
    candidates: list[dict[str, Any]],
) -> list[RankedRepository]:
    """
    Score and rank up to 50 repository candidates against a requirement.

    Scoring considers: repository name, description, README, file names, language.
    Returns a list of RankedRepository sorted by score descending.
    """
    client = _get_client()

    summaries: list[str] = []
    for repo in candidates[:50]:
        name = repo.get("repositoryName", repo.get("repository", ""))
        files_preview = ", ".join(repo.get("files", [])[:10])
        summaries.append(
            f"- Name: {name}\n"
            f"  Description: {repo.get('description', '')[:200]}\n"
            f"  Language: {repo.get('language', 'Unknown')}\n"
            f"  Key files: {files_preview or 'N/A'}\n"
            f"  README snippet: {repo.get('readme', '')[:300]}"
        )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior software consultant evaluating repository relevance. "
                    "Score each repository 0–100 based on how well it matches the requirement. "
                    "Consider: repository name, description, README, key file names, and language. "
                    "Return a JSON object with a 'rankings' array sorted by score descending. "
                    "Each item must have: 'repository' (string), 'score' (integer 0–100), "
                    "'reason' (one concise sentence explaining the match)."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Requirement: {requirement}\n\n"
                    f"Repositories:\n" + "\n".join(summaries)
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )

    content = response.choices[0].message.content or "{}"
    data = json.loads(content)

    return [
        RankedRepository(
            repository=item.get("repository", ""),
            score=int(item.get("score", 0)),
            reason=item.get("reason", ""),
        )
        for item in data.get("rankings", [])
        if item.get("repository")
    ]


async def generate_explanation(
    requirement: str,
    repository: dict[str, Any],
) -> RepositoryExplanation:
    """
    Generate a developer-friendly explanation of why a repository matches the requirement.

    References specific files and capabilities found in the repository.
    """
    client = _get_client()

    repo_name = repository.get("repositoryName", repository.get("repository", ""))
    files_preview = ", ".join(repository.get("files", [])[:15])

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior software consultant writing concise repository match summaries. "
                    "In 2–3 sentences explain why this repository is relevant to the requirement, "
                    "referencing specific files or capabilities where possible. "
                    "Return a JSON object with: "
                    "'explanation' (string, 2–3 sentences) and "
                    "'matched_capabilities' (list of 3–5 short capability labels such as "
                    "'JWT Authentication', 'RBAC', 'REST API', 'Entity Framework')."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Requirement: {requirement}\n\n"
                    f"Repository: {repo_name}\n"
                    f"Description: {repository.get('description', '')[:300]}\n"
                    f"Language: {repository.get('language', 'Unknown')}\n"
                    f"Key files: {files_preview or 'N/A'}\n"
                    f"README: {repository.get('readme', '')[:400]}"
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    content = response.choices[0].message.content or "{}"
    data = json.loads(content)

    return RepositoryExplanation(
        repository=repo_name,
        explanation=data.get("explanation", ""),
        matched_capabilities=data.get("matched_capabilities", []),
    )
