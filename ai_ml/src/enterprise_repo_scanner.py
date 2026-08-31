import json
import os
import requests

from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("GITHUB_ORG_TOKEN") or os.getenv("GITHUB_TOKEN")

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
}

OUTPUT_FILE = "ai_ml/data/enterprise_repositories.json"


def fetch_readme(owner, repo):

    url = f"https://api.github.com/repos/{owner}/{repo}/readme"

    response = requests.get(
        url,
        headers={
            **HEADERS,
            "Accept": "application/vnd.github.raw+json",
        },
        timeout=30,
    )

    if response.status_code != 200:
        return ""

    return response.text[:50000]


def fetch_accessible_repos():

    repos = []

    page = 1

    while True:

        response = requests.get(
            "https://api.github.com/user/repos",
            headers=HEADERS,
            params={
                "per_page": 100,
                "page": page,
            },
            timeout=30,
        )

        response.raise_for_status()

        items = response.json()

        if not items:
            break

        repos.extend(items)

        page += 1

    return repos


def main():

    repositories = []

    repos = fetch_accessible_repos()

    print(f"Found {len(repos)} accessible repositories")

    for repo in repos:

        full_name = repo["full_name"]

        print(f"Scanning {full_name}")

        readme = fetch_readme(
            repo["owner"]["login"],
            repo["name"],
        )

        repositories.append(
            {
                "repository": full_name,
                "description": repo.get("description") or "",
                "language": repo.get("language") or "Unknown",
                "stars": repo.get("stargazers_count", 0),
                "html_url": repo.get("html_url"),
                "topics": repo.get("topics", []),
                "readme": readme,
            }
        )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            repositories,
            file,
            indent=2,
            ensure_ascii=False,
        )

    print(f"Saved {len(repositories)} repositories")


if __name__ == "__main__":
    main()