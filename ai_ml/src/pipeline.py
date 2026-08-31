import argparse
import json

from .components import build_component_frequency, save_components
from .embeddings import build_embeddings_from_processed
from .faiss_indexer import build_index_from_embeddings
from .github_dataset_creator import create_dataset
from .search_engine import search_projects
from .text_processing import process_repository_file


def run_pipeline(seed_query: str, requirement_query: str, max_repos: int = 1000) -> dict:
    dataset = create_dataset(query=seed_query, max_repos=max_repos)
    processed = process_repository_file()
    vectors, metadata = build_embeddings_from_processed()
    build_index_from_embeddings()

    # Build Phase 2 component frequency artifact from processed corpus
    freq = build_component_frequency(processed)
    save_components(freq)

    top_results = search_projects(requirement_query, top_k=10)

    return {
        "dataset_count": len(dataset),
        "processed_count": len(processed),
        "embedding_vectors": int(vectors.shape[0]),
        "embedding_dimension": int(vectors.shape[1]) if vectors.size else 0,
        "metadata_count": len(metadata),
        "query": requirement_query,
        "top_results": top_results,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Consultant Copilot AI/ML pipeline")
    parser.add_argument("--seed-query", required=True, help="GitHub dataset search query")
    parser.add_argument("--query", required=True, help="Requirement query to search in FAISS")
    parser.add_argument("--max-repos", type=int, default=1000, help="Maximum repos to collect")
    args = parser.parse_args()

    result = run_pipeline(seed_query=args.seed_query, requirement_query=args.query, max_repos=args.max_repos)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
