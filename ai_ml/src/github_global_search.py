"""
Global GitHub repository search.

Converts a natural-language requirement into search keywords, queries the
GitHub Search API, and normalizes results to the same schema used for
enterprise repositories so both sources can be merged/reranked together.
"""

import asyncio
import logging
import os
import re
from typing import Any

import httpx
from dotenv import load_dotenv

from .config import GITHUB_API_BASE, SEARCH_REPOS_ENDPOINT

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}
if GITHUB_TOKEN:
    HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"

TOP_N = 100
PER_PAGE = 100  # GitHub Search API hard cap
README_CONCURRENCY = 10
MAX_RETRIES = 3

_STOP_WORDS = {
    "the", "and", "for", "with", "from", "into", "using", "build", "create",
    "need", "that", "this", "will", "should", "project", "application",
    "platform", "system", "have", "want", "implement", "support", "based",
}


# ── Keyword extraction ────────────────────────────────────────────────────────

def extract_keywords(requirement: str, limit: int = 6) -> list[str]:
    """Convert a natural-language requirement into ranked search keywords."""
    tokens = re.sub(r"[^a-zA-Z0-9\s.+#]", " ", requirement.lower()).split()
    seen: set[str] = set()
    keywords: list[str] = []

    for token in tokens:
        if len(token) <= 2 or token in _STOP_WORDS or token in seen:
            continue
        seen.add(token)
        keywords.append(token)

    return keywords[:limit] if keywords else ["software"]


# ── Rate-limit aware HTTP helper ──────────────────────────────────────────────

async def _get_with_rate_limit_handling(
    client: httpx.AsyncClient,
    url: str,
    params: dict[str, Any] | None = None,
) -> httpx.Response | None:
    for attempt in range(1, MAX_RETRIES + 1):
        response = await client.get(url, params=params, headers=HEADERS, timeout=30.0)

        remaining = response.headers.get("X-RateLimit-Remaining")
        if response.status_code in (403, 429) or (remaining is not None and remaining == "0"):
            reset_at = response.headers.get("X-RateLimit-Reset")
            wait_seconds = 5.0
            if reset_at:
                import time
                wait_seconds = max(1.0, float(reset_at) - time.time())
            logger.warning(
                "GitHub rate limit hit (attempt %d/%d) — sleeping %.1fs",
                attempt, MAX_RETRIES, wait_seconds,
            )
            await asyncio.sleep(min(wait_seconds, 60.0))
            continue

        if response.status_code >= 500:
            logger.warning("GitHub server error %d (attempt %d/%d)", response.status_code, attempt, MAX_RETRIES)
            await asyncio.sleep(2.0 * attempt)
            continue

        return response

    logger.error("Exhausted retries against %s", url)
    return None


# ── GitHub API calls ──────────────────────────────────────────────────────────

async def _search_repositories(client: httpx.AsyncClient, query: str, top_n: int) -> list[dict[str, Any]]:
    """Query the GitHub Search API and return up to top_n repository records."""
    results: list[dict[str, Any]] = []
    page = 1

    while len(results) < top_n:
        params = {
            "q": query,
            "sort": "stars",
            "order": "desc",
            "per_page": min(PER_PAGE, top_n - len(results)),
            "page": page,
        }
        response = await _get_with_rate_limit_handling(client, SEARCH_REPOS_ENDPOINT, params=params)
        if response is None or response.status_code != 200:
            logger.error("GitHub search failed: %s", response.status_code if response else "no response")
            break

        payload = response.json()
        items = payload.get("items", [])
        if not items:
            break

        results.extend(items)
        page += 1

        # GitHub Search API only exposes the first 1000 results (10 pages @ 100)
        if page > 10:
            break

    return results[:top_n]


async def _fetch_readme(client: httpx.AsyncClient, semaphore: asyncio.Semaphore, full_name: str) -> str:
    async with semaphore:
        url = f"{GITHUB_API_BASE}/repos/{full_name}/readme"
        response = await client.get(
            url,
            headers={**HEADERS, "Accept": "application/vnd.github.raw+json"},
            timeout=30.0,
        )
        if response is None or response.status_code != 200:
            return ""
        return response.text[:50000]


async def _fetch_top_level_files(client: httpx.AsyncClient, semaphore: asyncio.Semaphore, full_name: str) -> list[str]:
    async with semaphore:
        url = f"{GITHUB_API_BASE}/repos/{full_name}/contents"
        response = await client.get(url, headers=HEADERS, timeout=30.0)
        if response is None or response.status_code != 200:
            return []
        try:
            items = response.json()
        except ValueError:
            return []
        if not isinstance(items, list):
            return []
        return [item.get("name", "") for item in items if item.get("type") == "file"][:30]


# ── Normalization ─────────────────────────────────────────────────────────────

def _normalize(repo: dict[str, Any], readme: str, files: list[str]) -> dict[str, Any]:
    return {
        "repositoryId": str(repo.get("id", repo.get("full_name", ""))),
        "repositoryName": repo.get("full_name", ""),
        "description": repo.get("description") or "",
        "readme": readme,
        "language": repo.get("language") or "Unknown",
        "source": "GitHub",
        "url": repo.get("html_url", ""),
        "stars": repo.get("stargazers_count", 0),
        "topics": repo.get("topics", []),
        "files": files,
    }


# ── Public API ────────────────────────────────────────────────────────────────

async def search_github(requirement: str, top_n: int = TOP_N) -> list[dict[str, Any]]:
    """
    Convert a requirement into keywords, search GitHub, and return a normalized
    list of up to top_n repositories with README + top-level file enrichment.
    """
    keywords = extract_keywords(requirement)
    query = " ".join(keywords)
    logger.info("GitHub search query: %s", query)

    async with httpx.AsyncClient() as client:
        raw_results = await _search_repositories(client, query, top_n)
        logger.info("GitHub search returned %d repositories", len(raw_results))

        semaphore = asyncio.Semaphore(README_CONCURRENCY)
        readmes = await asyncio.gather(
            *[_fetch_readme(client, semaphore, r["full_name"]) for r in raw_results],
            return_exceptions=True,
        )
        files_lists = await asyncio.gather(
            *[_fetch_top_level_files(client, semaphore, r["full_name"]) for r in raw_results],
            return_exceptions=True,
        )

    normalized: list[dict[str, Any]] = []
    for repo, readme, files in zip(raw_results, readmes, files_lists):
        readme_text = readme if isinstance(readme, str) else ""
        file_list = files if isinstance(files, list) else []
        normalized.append(_normalize(repo, readme_text, file_list))

    logger.info("Normalized %d GitHub repositories", len(normalized))
    return normalized


def main() -> None:
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Search GitHub for repositories matching a requirement")
    parser.add_argument("--requirement", required=True, help="Natural-language requirement text")
    parser.add_argument("--top-n", type=int, default=TOP_N, help="Number of repositories to retrieve")
    args = parser.parse_args()

    results = asyncio.run(search_github(args.requirement, top_n=args.top_n))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
