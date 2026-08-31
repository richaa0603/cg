import json

from .github_dataset_creator import fetch_repositories
from .config import REPOSITORIES_JSON

SEED_QUERIES = [
    "authentication",
    "notification",
    "employee management",
    "attendance system",
    "payroll system",
    "hrms",
    "insurance",
    "healthcare",
    "banking",
    "crm",
    "erp",
    "project management",
    "task management",
    "workflow engine",
    "analytics dashboard",
    "ecommerce",
]


def build_corpus(per_domain=50):
    all_repos = []
    seen = set()

    for query in SEED_QUERIES:

        print(f"\nCollecting: {query}")

        repos = fetch_repositories(
            query=query,
            max_repos=per_domain
        )

        for repo in repos:

            full_name = repo["full_name"]

            if full_name in seen:
                continue

            seen.add(full_name)
            all_repos.append(repo)

        print(
            f"Current Corpus Size: {len(all_repos)}"
        )

    REPOSITORIES_JSON.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with REPOSITORIES_JSON.open(
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            all_repos,
            f,
            indent=2,
            ensure_ascii=False
        )

    print(
        f"\nFinal Corpus Size: {len(all_repos)}"
    )


if __name__ == "__main__":
    build_corpus()