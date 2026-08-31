"""Expert Discovery Engine — Phase 2 Module 2.

expert_score = commit_score (0-50) + repo_count_score (0-30) + tech_score (0-20)
"""
import argparse
import json
import os
import time
from collections import defaultdict
from typing import Any

import requests

from .config import EXPERTS_JSON, REPOSITORIES_JSON

_GITHUB_API = "https://api.github.com"

# Technology categories used to compute tech_score
_TECH_CATEGORIES: dict[str, list[str]] = {
    "frontend":  ["react", "angular", "vue", "typescript", "javascript", "css"],
    "backend":   ["python", "java", "c#", "go", "rust", "node", "spring", "dotnet", "fastapi"],
    "data":      ["sql", "postgres", "mysql", "mongo", "redis", "elasticsearch"],
    "cloud":     ["azure", "aws", "gcp", "kubernetes", "docker", "terraform"],
    "ml":        ["pytorch", "tensorflow", "sklearn", "pandas", "embedding", "faiss"],
}


def _headers() -> dict[str, str]:
    token = os.getenv("GITHUB_TOKEN", "")
    h = {"Accept": "application/vnd.github+json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _fetch_contributors(full_name: str) -> list[dict[str, Any]]:
    url = f"{_GITHUB_API}/repos/{full_name}/contributors"
    resp = requests.get(url, headers=_headers(), params={"per_page": 30, "anon": "false"}, timeout=20)
    if resp.status_code in (404, 403, 451):
        return []
    resp.raise_for_status()
    return resp.json() or []


def _compute_scores(profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not profiles:
        return []

    max_commits = max((p["commits"] for p in profiles), default=1) or 1
    max_repos = max((p["repo_count"] for p in profiles), default=1) or 1

    scored = []
    for p in profiles:
        commit_score = round((p["commits"] / max_commits) * 50)
        repo_count_score = round((p["repo_count"] / max_repos) * 30)
        tech_cats_covered = sum(
            1 for _, kws in _TECH_CATEGORIES.items()
            if any(kw in p["languages"] for kw in kws)
        )
        tech_score = min(20, tech_cats_covered * 5)
        total = commit_score + repo_count_score + tech_score
        scored.append({
            "name": p["name"],
            "login": p["login"],
            "score": total,
            "commit_score": commit_score,
            "repo_count_score": repo_count_score,
            "tech_score": tech_score,
            "languages": p["languages"],
            "avatar_url": p["avatar_url"],
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


def build_expert_profiles(max_repos: int = 50) -> list[dict[str, Any]]:
    """Aggregate GitHub contributor data across repositories and compute expert_score."""
    if not REPOSITORIES_JSON.exists():
        return []

    with REPOSITORIES_JSON.open("r", encoding="utf-8") as fh:
        repos: list[dict[str, Any]] = json.load(fh)

    bucket: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"name": "", "login": "", "commits": 0, "repo_count": 0, "languages": [], "avatar_url": ""}
    )

    for repo in repos[:max_repos]:
        full_name = repo.get("full_name", "")
        language = (repo.get("language") or "").lower()
        if not full_name:
            continue

        try:
            contributors = _fetch_contributors(full_name)
        except requests.RequestException:
            continue

        for contrib in contributors:
            login = (contrib.get("login") or "").lower()
            if not login or contrib.get("type") == "Bot":
                continue
            bucket[login]["name"] = contrib.get("login", login)
            bucket[login]["login"] = login
            bucket[login]["commits"] += int(contrib.get("contributions") or 0)
            bucket[login]["repo_count"] += 1
            if language and language not in bucket[login]["languages"]:
                bucket[login]["languages"].append(language)
            if not bucket[login]["avatar_url"]:
                bucket[login]["avatar_url"] = contrib.get("avatar_url", "")

        time.sleep(0.15)

    return _compute_scores(list(bucket.values()))


def save_experts(experts: list[dict[str, Any]]) -> None:
    EXPERTS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with EXPERTS_JSON.open("w", encoding="utf-8") as fh:
        json.dump({"experts": experts}, fh, indent=2)


def recommend_experts(requirement: str, top_k: int = 10) -> list[dict[str, Any]]:
    """Load saved profiles and re-rank by technology match to requirement."""
    if not EXPERTS_JSON.exists():
        return []

    with EXPERTS_JSON.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    experts: list[dict[str, Any]] = data.get("experts", [])

    req_lower = requirement.lower()
    req_cats = {
        cat for cat, kws in _TECH_CATEGORIES.items()
        if any(kw in req_lower for kw in kws)
    }

    ranked = []
    for e in experts:
        bonus = sum(
            5 for cat, kws in _TECH_CATEGORIES.items()
            if cat in req_cats and any(kw in e.get("languages", []) for kw in kws)
        )
        ranked.append({"name": e["name"], "score": min(100, e["score"] + bonus)})

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return ranked[:top_k]


def main() -> None:
    parser = argparse.ArgumentParser(description="Expert Discovery Engine")
    parser.add_argument("--requirement", default="Need Attendance Management System")
    parser.add_argument("--build", action="store_true", help="Fetch contributor data and build experts.json")
    parser.add_argument("--max-repos", type=int, default=50, help="Repos to scan (each needs a GitHub API call)")
    args = parser.parse_args()

    if args.build:
        print("Fetching contributor data from GitHub API…")
        profiles = build_expert_profiles(max_repos=args.max_repos)
        save_experts(profiles)
        print(json.dumps({"built": True, "expert_count": len(profiles)}, indent=2))
    else:
        result = recommend_experts(args.requirement)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
