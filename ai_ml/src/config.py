from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
ARTIFACTS_DIR = ROOT_DIR / "artifacts"

REPOSITORIES_JSON = DATA_DIR / "repositories.json"
PROCESSED_REPOSITORIES_JSON = DATA_DIR / "processed_repositories.json"
REPOSITORY_METADATA_JSON = DATA_DIR / "repository_metadata.json"
COMPONENTS_JSON = DATA_DIR / "components.json"
EXPERTS_JSON = DATA_DIR / "experts.json"

EMBEDDINGS_NPY = ARTIFACTS_DIR / "repository_embeddings.npy"
FAISS_INDEX_BIN = ARTIFACTS_DIR / "faiss_index.bin"

GITHUB_API_BASE = "https://api.github.com"
SEARCH_REPOS_ENDPOINT = f"{GITHUB_API_BASE}/search/repositories"
