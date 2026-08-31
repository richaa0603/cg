import json
import argparse

import numpy as np
from sentence_transformers import SentenceTransformer

from .config import EMBEDDINGS_NPY, PROCESSED_REPOSITORIES_JSON, REPOSITORY_METADATA_JSON

MODEL_NAME = "all-MiniLM-L6-v2"


def encode_texts(texts: list[str]) -> np.ndarray:
    model = SentenceTransformer(MODEL_NAME)
    vectors = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
    return np.array(vectors, dtype=np.float32)


def save_embeddings(vectors: np.ndarray) -> None:
    EMBEDDINGS_NPY.parent.mkdir(parents=True, exist_ok=True)
    np.save(EMBEDDINGS_NPY, vectors)


def build_embeddings_from_processed() -> tuple[np.ndarray, list[dict]]:
    with PROCESSED_REPOSITORIES_JSON.open("r", encoding="utf-8") as file:
        records = json.load(file)

    texts = [str(item.get("search_text", "")) for item in records]
    vectors = encode_texts(texts)
    save_embeddings(vectors)

    metadata: list[dict] = []
    for idx, row in enumerate(records):
        metadata.append(
            {
                "id": idx,
                "repository": row.get("full_name") or row.get("name") or "",
                "name": row.get("name", ""),
                "owner": row.get("owner", ""),
                "language": row.get("language", "Unknown"),
                "stars": int(row.get("stars") or 0),
                "description": row.get("description", ""),
                "html_url": row.get("html_url", ""),
            }
        )

    REPOSITORY_METADATA_JSON.parent.mkdir(parents=True, exist_ok=True)
    with REPOSITORY_METADATA_JSON.open("w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=2)

    return vectors, metadata


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate repository embeddings and metadata mapping")
    parser.parse_args()

    vectors, metadata = build_embeddings_from_processed()
    print(
        json.dumps(
            {
                "embedding_vectors": int(vectors.shape[0]),
                "embedding_dimension": int(vectors.shape[1]) if vectors.size else 0,
                "metadata_records": len(metadata),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
