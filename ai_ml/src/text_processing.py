import json
import re
import argparse

import pandas as pd

from .config import PROCESSED_REPOSITORIES_JSON, REPOSITORIES_JSON


def _clean_text(value: str) -> str:
    text = value.lower()
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def build_search_text(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame["topics_text"] = frame["topics"].apply(lambda topics: " ".join(topics) if isinstance(topics, list) else "")

    frame["search_text"] = (
        frame["name"].fillna("")
        + " "
        + frame["description"].fillna("")
        + " "
        + frame["readme"].fillna("")
        + " "
        + frame["topics_text"].fillna("")
    )

    frame["search_text"] = frame["search_text"].fillna("").apply(_clean_text)
    frame = frame.drop_duplicates(subset=["full_name"]).reset_index(drop=True)
    return frame


def process_repository_file() -> list[dict]:
    with REPOSITORIES_JSON.open("r", encoding="utf-8") as file:
        records = json.load(file)

    frame = pd.DataFrame(records)
    if frame.empty:
        return []

    processed = build_search_text(frame).to_dict(orient="records")
    PROCESSED_REPOSITORIES_JSON.parent.mkdir(parents=True, exist_ok=True)
    with PROCESSED_REPOSITORIES_JSON.open("w", encoding="utf-8") as file:
        json.dump(processed, file, indent=2)

    return processed


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate processed repository corpus with search_text")
    parser.parse_args()

    records = process_repository_file()
    print(json.dumps({"saved": len(records)}, indent=2))


if __name__ == "__main__":
    main()
