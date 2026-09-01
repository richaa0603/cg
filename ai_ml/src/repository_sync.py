"""
Async sync client for the .NET backend repository catalog.

Consumes:  GET /api/repositories  (optionally paginated via ?page=&pageSize=)

Features:
  - httpx.AsyncClient with connection pooling
  - Exponential-backoff retries on network errors / 5xx responses
  - Incremental merge into enterprise_repositories.json (keyed by repositoryId)
  - Paginated fetch to support large datasets without holding the whole
    response set hostage on a single request
  - Structured logging of fetch / merge counts
"""

import asyncio
import json
import logging
import os
from typing import Any

import httpx
from dotenv import load_dotenv

from .config import ENTERPRISE_REPOSITORIES_JSON

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("DOTNET_REPOSITORIES_API_URL", "http://localhost:5000/api/repositories")
PAGE_SIZE = int(os.getenv("REPOSITORY_SYNC_PAGE_SIZE", "200"))
MAX_RETRIES = int(os.getenv("REPOSITORY_SYNC_MAX_RETRIES", "4"))
INITIAL_BACKOFF_SECONDS = 1.0
REQUEST_TIMEOUT = httpx.Timeout(60.0, connect=10.0)


# ── HTTP layer with retries ───────────────────────────────────────────────────

async def _fetch_page(
    client: httpx.AsyncClient,
    page: int,
    page_size: int,
) -> list[dict[str, Any]]:
    """Fetch a single page of repositories, retrying on transient failures."""
    params = {"page": page, "pageSize": page_size}
    backoff = INITIAL_BACKOFF_SECONDS

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = await client.get(BACKEND_URL, params=params, timeout=REQUEST_TIMEOUT)

            if response.status_code >= 500:
                raise httpx.HTTPStatusError(
                    f"Server error {response.status_code}", request=response.request, response=response
                )

            response.raise_for_status()
            payload = response.json()

            # Backend may return either a bare array or {"items": [...]}
            if isinstance(payload, dict):
                return payload.get("items", payload.get("repositories", []))
            return payload

        except (httpx.RequestError, httpx.HTTPStatusError) as exc:
            if attempt == MAX_RETRIES:
                logger.error("Failed to fetch page %d after %d attempts: %s", page, attempt, exc)
                raise

            logger.warning(
                "Fetch page %d failed (attempt %d/%d): %s — retrying in %.1fs",
                page, attempt, MAX_RETRIES, exc, backoff,
            )
            await asyncio.sleep(backoff)
            backoff *= 2

    return []  # unreachable, satisfies type checkers


async def _fetch_all_repositories(page_size: int = PAGE_SIZE) -> list[dict[str, Any]]:
    """
    Fetch every repository page-by-page until an empty/short page is returned.

    Falls back gracefully if the backend ignores pagination and returns the
    entire dataset on page 1 (the following page-2 request will come back empty).
    """
    all_repos: list[dict[str, Any]] = []

    async with httpx.AsyncClient() as client:
        page = 1
        while True:
            batch = await _fetch_page(client, page, page_size)
            if not batch:
                break

            all_repos.extend(batch)
            logger.info("Fetched page %d — %d repositories (running total: %d)", page, len(batch), len(all_repos))

            if len(batch) < page_size:
                break
            page += 1

    return all_repos


# ── Persistence / incremental merge ───────────────────────────────────────────

def _load_existing() -> dict[str, dict[str, Any]]:
    if not ENTERPRISE_REPOSITORIES_JSON.exists():
        return {}

    with ENTERPRISE_REPOSITORIES_JSON.open("r", encoding="utf-8") as fh:
        records: list[dict[str, Any]] = json.load(fh)

    return {str(r.get("repositoryId", r.get("repositoryName", ""))): r for r in records}


def _save(records: dict[str, dict[str, Any]]) -> None:
    ENTERPRISE_REPOSITORIES_JSON.parent.mkdir(parents=True, exist_ok=True)
    with ENTERPRISE_REPOSITORIES_JSON.open("w", encoding="utf-8") as fh:
        json.dump(list(records.values()), fh, indent=2, ensure_ascii=False)


def _merge_incremental(
    existing: dict[str, dict[str, Any]],
    fetched: list[dict[str, Any]],
) -> tuple[dict[str, dict[str, Any]], int, int]:
    """Merge fetched repositories into the existing keyed collection."""
    new_count = 0
    updated_count = 0

    for repo in fetched:
        key = str(repo.get("repositoryId", repo.get("repositoryName", "")))
        if not key:
            continue

        if key in existing:
            if existing[key] != repo:
                updated_count += 1
        else:
            new_count += 1

        existing[key] = repo

    return existing, new_count, updated_count


# ── Public API ────────────────────────────────────────────────────────────────

async def sync_repositories() -> list[dict[str, Any]]:
    """
    Fetch all repositories from the .NET backend and incrementally persist
    them to enterprise_repositories.json.

    Returns the full merged repository list.
    """
    logger.info("Starting repository sync from %s", BACKEND_URL)

    existing = _load_existing()
    logger.info("Loaded %d existing repositories from disk", len(existing))

    fetched = await _fetch_all_repositories()
    logger.info("Fetched %d repositories from backend", len(fetched))

    merged, new_count, updated_count = _merge_incremental(existing, fetched)
    _save(merged)

    logger.info(
        "Sync complete — total: %d, new: %d, updated: %d, unchanged: %d",
        len(merged), new_count, updated_count, len(merged) - new_count - updated_count,
    )

    return list(merged.values())


def sync_repositories_sync() -> list[dict[str, Any]]:
    """Synchronous convenience wrapper for callers that are not async."""
    return asyncio.run(sync_repositories())


def main() -> None:
    repos = asyncio.run(sync_repositories())
    print(json.dumps({"total_repositories": len(repos)}, indent=2))


if __name__ == "__main__":
    main()
