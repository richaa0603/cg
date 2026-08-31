import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

OUTPUT = Path("ai_ml/data/enterprise_repositories.json")

TOKEN = os.getenv("GITHUB_TOKEN")

HEADERS = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"Bearer {TOKEN}"
}


def get_readme(owner, repo):
    url = f"https://api.github.com/repos/{owner}/{repo}/readme"

    response = requests.get(
        url,
        headers={
            **HEADERS,
            "Accept": "application/vnd.github.raw+json"
        }
    )

    if response.status_code != 200:
        return ""

    return response.text[:50000]


def scan_org(org_name):
    repos = []

    page = 1

    while True:
        response = requests.get(
            f"https://api.github.com/orgs/{org_name}/repos",
            params={
                "per_page": 100,
                "page": page
            },
            headers=HEADERS
        )

        response.raise_for_status()

        items = response.json()

        if not items:
            break

        for repo in items:

            readme = get_readme(
                repo["owner"]["login"],
                repo["name"]
            )

            repos.append({
                "repository": repo["full_name"],
                "description": repo.get("description", ""),
                "language": repo.get("language"),
                "stars": repo.get("stargazers_count", 0),
                "html_url": repo["html_url"],
                "topics": repo.get("topics", []),
                "readme": readme
            })

        page += 1

    return repos


def main():

    config = json.load(
        open("ai_ml/config/orgs.json")
    )

    all_repositories = []

    for org in config["orgs"]:

        print(f"Scanning {org}")

        repos = scan_org(org)

        all_repositories.extend(repos)

    OUTPUT.parent.mkdir(
        exist_ok=True,
        parents=True
    )

    json.dump(
        all_repositories,
        open(OUTPUT, "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=2
    )

    print(
        f"Saved {len(all_repositories)} repositories"
    )


if __name__ == "__main__":
    main()