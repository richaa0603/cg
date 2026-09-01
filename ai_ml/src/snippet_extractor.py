"""
Extract short, relevant code snippets (≤30 lines) from matched repository files.

Content source priority:
  1. repository["fileContents"][path]   — pre-fetched content, if the caller has it
  2. GitHub raw contents API            — best-effort fetch when repository["url"]
                                           points at github.com and the file is public
  3. Heuristic fallback                 — no snippet available; return a reason only

Extraction strategy:
  - Python files: AST-aware — locate the function/class whose body best matches
    the requirement/file-label keywords, and slice its source lines (capped at 30).
  - Other languages: brace/indent-aware heuristic — find the most relevant line
    window (function/method boundary approximation) around the first keyword hit.
"""

import ast
import logging
import os
import re
from typing import Any

import httpx
from dotenv import load_dotenv

from .repository_intelligence import classify_file

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

MAX_SNIPPET_LINES = 30
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
_GITHUB_URL_RE = re.compile(r"github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$", re.I)


# ── Content retrieval ─────────────────────────────────────────────────────────

def _parse_owner_repo(url: str) -> tuple[str, str] | None:
    match = _GITHUB_URL_RE.search(url or "")
    if not match:
        return None
    return match.group(1), match.group(2)


async def _fetch_remote_content(url: str, path: str) -> str | None:
    owner_repo = _parse_owner_repo(url)
    if not owner_repo:
        return None
    owner, repo = owner_repo

    headers = {
        "Accept": "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

    api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(api_url, headers=headers, timeout=20.0)
        if response.status_code != 200:
            return None
        return response.text
    except httpx.RequestError as exc:
        logger.warning("Failed to fetch %s: %s", path, exc)
        return None


async def _get_file_content(repository: dict[str, Any], path: str) -> str | None:
    cached = repository.get("fileContents", {})
    if path in cached:
        return cached[path]
    url = repository.get("url", repository.get("html_url", ""))
    return await _fetch_remote_content(url, path)


# ── Keyword helpers ───────────────────────────────────────────────────────────

def _tokenize(text: str) -> set[str]:
    tokens = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower()).split()
    return {t for t in tokens if len(t) > 2}


def _relevance_keywords(requirement: str, path: str) -> set[str]:
    keywords = _tokenize(requirement)
    label = classify_file(path)
    if label:
        keywords |= _tokenize(label)
    return keywords


# ── Python AST-aware extraction ───────────────────────────────────────────────

def _extract_python_snippet(content: str, keywords: set[str]) -> tuple[str, str] | None:
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return None

    lines = content.splitlines()
    best_node: ast.AST | None = None
    best_score = -1

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue

        name_tokens = _tokenize(node.name)
        score = len(name_tokens & keywords)
        if score > best_score:
            best_score = score
            best_node = node

    if best_node is None or best_score <= 0:
        return None

    start = best_node.lineno - 1
    end = getattr(best_node, "end_lineno", start + MAX_SNIPPET_LINES)
    snippet_lines = lines[start:min(end, start + MAX_SNIPPET_LINES)]

    return "\n".join(snippet_lines), f"{best_node.name} implementation relevant to the requirement"


# ── Generic brace/indent-aware fallback ───────────────────────────────────────

def _extract_generic_snippet(content: str, keywords: set[str]) -> tuple[str, str] | None:
    lines = content.splitlines()
    best_idx = -1
    best_score = -1

    for i, line in enumerate(lines):
        tokens = _tokenize(line)
        score = len(tokens & keywords)
        if score > best_score:
            best_score = score
            best_idx = i

    if best_idx == -1 or best_score <= 0:
        return None

    # Expand upward to the nearest function/method/class signature line
    start = best_idx
    signature_re = re.compile(
        r"^\s*(public|private|protected|internal|static|async|def|function|class|export)\b",
        re.I,
    )
    while start > 0 and not signature_re.match(lines[start]):
        start -= 1
        if best_idx - start >= MAX_SNIPPET_LINES - 1:
            break

    end = min(len(lines), start + MAX_SNIPPET_LINES)
    snippet_lines = lines[start:end]

    return "\n".join(snippet_lines), "Code block matching requirement keywords"


# ── Public API ────────────────────────────────────────────────────────────────

async def extract_snippet(
    repository: dict[str, Any],
    file_path: str,
    requirement: str,
) -> dict[str, Any] | None:
    """
    Extract the single most relevant snippet (≤30 lines) from one file.

    Returns None if content could not be retrieved.
    """
    content = await _get_file_content(repository, file_path)
    if not content:
        label = classify_file(file_path)
        return {
            "file": file_path,
            "snippet": "",
            "reason": f"{label} file (content unavailable for preview)" if label else "Content unavailable for preview",
        }

    keywords = _relevance_keywords(requirement, file_path)

    result = None
    if file_path.endswith(".py"):
        result = _extract_python_snippet(content, keywords)

    if result is None:
        result = _extract_generic_snippet(content, keywords)

    if result is None:
        # Fall back to the first MAX_SNIPPET_LINES non-empty lines
        lines = [ln for ln in content.splitlines() if ln.strip()][:MAX_SNIPPET_LINES]
        result = ("\n".join(lines), "Representative excerpt from the file")

    snippet, reason = result
    return {"file": file_path, "snippet": snippet, "reason": reason}


async def extract_snippets(
    repository: dict[str, Any],
    matched_files: list[str],
    requirement: str,
) -> list[dict[str, Any]]:
    """Extract relevant snippets for each matched file."""
    import asyncio

    results = await asyncio.gather(
        *[extract_snippet(repository, path, requirement) for path in matched_files],
        return_exceptions=True,
    )

    snippets: list[dict[str, Any]] = []
    for path, result in zip(matched_files, results):
        if isinstance(result, Exception) or result is None:
            logger.warning("Snippet extraction failed for %s", path)
            continue
        snippets.append(result)

    return snippets


def main() -> None:
    import argparse
    import asyncio
    import json

    parser = argparse.ArgumentParser(description="Extract relevant code snippets from matched files")
    parser.add_argument("--repository-file", required=True, help="Path to a JSON repository object")
    parser.add_argument("--requirement", required=True)
    parser.add_argument("--files", nargs="+", required=True, help="Matched file paths")
    args = parser.parse_args()

    with open(args.repository_file, encoding="utf-8") as fh:
        repository = json.load(fh)

    results = asyncio.run(extract_snippets(repository, args.files, args.requirement))
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
