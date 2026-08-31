# test_orgs.py

import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("GITHUB_ORG_TOKEN") or os.getenv("GITHUB_TOKEN")

response = requests.get(
    "https://api.github.com/user/orgs",
    headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json"
    },
    timeout=30
)

print("Status:", response.status_code)

for org in response.json():
    print(org["login"])
