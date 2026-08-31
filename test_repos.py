# test_repos.py

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
        "per_page": 20
    }
)

print("Status:", response.status_code)

repos = response.json()

print("Repository Count Returned:", len(repos))

for repo in repos:
    print(repo["full_name"])