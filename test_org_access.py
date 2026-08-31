import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("GITHUB_ORG_TOKEN")

print("Token Found:", bool(token))

if not token:
    print("GITHUB_ORG_TOKEN not found in .env")
    raise SystemExit()

response = requests.get(
    "https://api.github.com/user",
    headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    },
    timeout=30,
)

print("Status Code:", response.status_code)
print(response.text[:500])