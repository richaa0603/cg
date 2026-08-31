import faiss
import numpy as np
import argparse
import json

from .config import EMBEDDINGS_NPY, FAISS_INDEX_BIN


def create_index(vectors: np.ndarray) -> faiss.Index:
    dimension = vectors.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(vectors)
    return index


def save_index(index: faiss.Index) -> None:
    FAISS_INDEX_BIN.parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(FAISS_INDEX_BIN))


def load_index() -> faiss.Index:
    return faiss.read_index(str(FAISS_INDEX_BIN))


def build_index_from_embeddings() -> faiss.Index:
    vectors = np.load(EMBEDDINGS_NPY).astype(np.float32)
    index = create_index(vectors)
    save_index(index)
    return index


def main() -> None:
    parser = argparse.ArgumentParser(description="Build FAISS index from repository embeddings")
    parser.parse_args()

    index = build_index_from_embeddings()
    print(json.dumps({"index_size": int(index.ntotal)}, indent=2))


if __name__ == "__main__":
    main()
