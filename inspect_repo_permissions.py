# inspect_repo_permissions.py

import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("GITHUB_ORG_TOKEN") or os.getenv("GITHUB_TOKEN")

response = requests.get(
    "https://api.github.com/user/repos",
    headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json"
    },
    params={
        "per_page": 100,
        "affiliation": "owner,collaborator,organization_member"
    }
)

repos = response.json()

print("Total:", len(repos))

for repo in repos:
    print(
        repo["full_name"],
        "| private =", repo["private"]
    )
