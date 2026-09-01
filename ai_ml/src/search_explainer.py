"""Generate concise, developer-focused explanations of why a repository matches a requirement."""

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

class SearchExplanation(BaseModel):
    explanation: str
    strengths: list[str] = Field(default_factory=list)
    matched_capabilities: list[str] = Field(default_factory=list)
    confidence: int = Field(..., ge=0, le=100)


# ── Public API ────────────────────────────────────────────────────────────────

async def explain_match(
    requirement: str,
    repository: dict[str, Any],
    matched_files: list[str],
    technologies: list[str],
) -> SearchExplanation:
    """
    Generate a structured, developer-friendly explanation of a repository match.

    Falls back to a heuristic explanation if the OpenAI call fails.
    """
    repo_name = repository.get("repositoryName", repository.get("repository", ""))

    try:
        client = _get_client()

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a senior software consultant explaining repository search results "
                        "to a developer. Be concise, technical, and specific — reference actual file "
                        "names and technologies provided. "
                        "Return a JSON object with: "
                        "'explanation' (2-3 sentences), "
                        "'strengths' (2-4 short bullet phrases on why this repo is strong for the requirement), "
                        "'matched_capabilities' (3-6 short capability labels), "
                        "'confidence' (integer 0-100 reflecting match confidence)."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Requirement: {requirement}\n\n"
                        f"Repository: {repo_name}\n"
                        f"Description: {repository.get('description', '')[:300]}\n"
                        f"Technologies: {', '.join(technologies)}\n"
                        f"Matched files: {', '.join(matched_files[:15])}"
                    ),
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)

        return SearchExplanation(
            explanation=data.get("explanation", ""),
            strengths=data.get("strengths", []),
            matched_capabilities=data.get("matched_capabilities", []),
            confidence=int(data.get("confidence", 50)),
        )

    except Exception as exc:
        logger.warning("OpenAI explanation failed for %s: %s — using heuristic fallback", repo_name, exc)
        return _fallback_explanation(repo_name, matched_files, technologies)


def _fallback_explanation(
    repo_name: str,
    matched_files: list[str],
    technologies: list[str],
) -> SearchExplanation:
    file_list = ", ".join(matched_files[:5]) or "no specific files"
    tech_list = ", ".join(technologies[:5]) or "an unspecified stack"

    return SearchExplanation(
        explanation=f"{repo_name} matches based on {file_list}, built with {tech_list}.",
        strengths=[f"Uses {t}" for t in technologies[:3]],
        matched_capabilities=technologies[:5],
        confidence=50,
    )


def main() -> None:
    import argparse
    import asyncio

    parser = argparse.ArgumentParser(description="Explain why a repository matches a requirement")
    parser.add_argument("--repository-file", required=True, help="Path to a JSON repository object")
    parser.add_argument("--requirement", required=True)
    parser.add_argument("--files", nargs="*", default=[], help="Matched file paths")
    parser.add_argument("--technologies", nargs="*", default=[], help="Detected technologies")
    args = parser.parse_args()

    with open(args.repository_file, encoding="utf-8") as fh:
        repository = json.load(fh)

    result = asyncio.run(explain_match(args.requirement, repository, args.files, args.technologies))
    print(result.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
