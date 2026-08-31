import argparse
import json
import os
import time
from typing import Any

import requests
from dotenv import load_dotenv

from .config import REPOSITORIES_JSON, SEARCH_REPOS_ENDPOINT

load_dotenv()

REQUEST_TIMEOUT = 30


def _request_headers() -> dict[str, str]:
    token = os.getenv("GITHUB_TOKEN", "").strip()

    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "ConsultantCopilot"
    }

    if token:
        headers["Authorization"] = f"Bearer {token}"

    return headers


def _safe_get(url: str, **kwargs):
    response = requests.get(url, **kwargs)

    if response.status_code == 429:
        print("Rate limit reached (429). Sleeping for 60 seconds...")
        time.sleep(60)

        response = requests.get(url, **kwargs)

    if response.status_code == 403:
        remaining = response.headers.get(
            "X-RateLimit-Remaining",
            "unknown"
        )

        reset = response.headers.get(
            "X-RateLimit-Reset",
            "unknown"
        )

        raise RuntimeError(
            f"GitHub rate limit exceeded. "
            f"Remaining: {remaining}, Reset: {reset}"
        )

    response.raise_for_status()
    return response


def _fetch_readme(full_name: str) -> str:
    endpoint = f"https://api.github.com/repos/{full_name}/readme"

    try:
        response = _safe_get(
            endpoint,
            headers={
                **_request_headers(),
                "Accept": "application/vnd.github.raw+json"
            },
            timeout=REQUEST_TIMEOUT
        )

        return response.text.strip()

    except requests.HTTPError as ex:
        if ex.response is not None and ex.response.status_code == 404:
            return ""

        print(f"README fetch failed: {full_name}")
        return ""


def _build_search_query(user_query: str) -> str:
    cleaned = user_query.strip()

    if not cleaned:
        cleaned = "authentication"

    return (
        f"{cleaned} "
        f"stars:>20 "
        f"fork:false "
        f"archived:false"
    )


def fetch_repositories(
    query: str,
    max_repos: int = 1000,
    per_page: int = 100
) -> list[dict[str, Any]]:

    repositories: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    page = 1

    print(f"\nSearching GitHub for: {query}")

    while len(repositories) < max_repos and page <= 10:

        params = {
            "q": _build_search_query(query),
            "sort": "stars",
            "order": "desc",
            "per_page": per_page,
            "page": page,
        }

        try:
            response = _safe_get(
                SEARCH_REPOS_ENDPOINT,
                headers=_request_headers(),
                params=params,
                timeout=REQUEST_TIMEOUT
            )

        except Exception as ex:
            print(f"Page {page} failed: {ex}")
            break

        items = response.json().get("items", [])

        print(
            f"Page {page}: "
            f"{len(items)} repositories returned"
        )

        if not items:
            break

        for item in items:

            repo_id = item.get("id")

            if not repo_id:
                continue

            if repo_id in seen_ids:
                continue

            seen_ids.add(repo_id)

            description = (
                item.get("description") or ""
            ).strip()

            if not description:
                continue

            if item.get("fork", False):
                continue

            if item.get("archived", False):
                continue

            if int(item.get("size") or 0) <= 0:
                continue

            stars = int(
                item.get("stargazers_count") or 0
            )

            if stars <= 20:
                continue

            full_name = item.get("full_name", "")

            if not full_name:
                continue

            readme = _fetch_readme(full_name)

            if not readme:
                continue

            repositories.append(
                {
                    "id": repo_id,
                    "name": item.get("name", ""),
                    "full_name": full_name,
                    "owner": (
                        item.get("owner") or {}
                    ).get("login", ""),
                    "description": description,
                    "topics": item.get("topics", []),
                    "language": (
                        item.get("language")
                        or "Unknown"
                    ),
                    "stars": stars,
                    "forks": int(
                        item.get("forks_count") or 0
                    ),
                    "html_url": item.get(
                        "html_url",
                        ""
                    ),
                    "readme": readme,
                }
            )

            if len(repositories) % 10 == 0:
                print(
                    f"Collected: "
                    f"{len(repositories)} repos"
                )

            if len(repositories) >= max_repos:
                break

            time.sleep(0.1)

        page += 1
        time.sleep(1)

    return repositories


def save_repositories(
    repositories: list[dict[str, Any]]
) -> None:

    REPOSITORIES_JSON.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with REPOSITORIES_JSON.open(
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            repositories,
            file,
            indent=2,
            ensure_ascii=False
        )


def create_dataset(
    query: str,
    max_repos: int = 1000
) -> list[dict[str, Any]]:

    repositories = fetch_repositories(
        query=query,
        max_repos=max_repos
    )

    save_repositories(repositories)

    return repositories


def main() -> None:

    parser = argparse.ArgumentParser(
        description="Build GitHub repository dataset"
    )

    parser.add_argument(
        "--query",
        default="authentication"
    )

    parser.add_argument(
        "--max-repos",
        type=int,
        default=100
    )

    args = parser.parse_args()

    repositories = create_dataset(
        query=args.query,
        max_repos=args.max_repos
    )

    print(
        json.dumps(
            {
                "saved": len(repositories)
            },
            indent=2
        )
    )


if __name__ == "__main__":
    main()