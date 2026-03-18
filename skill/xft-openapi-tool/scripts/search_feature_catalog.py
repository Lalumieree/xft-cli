#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


INDEX_PATH = Path(__file__).resolve().parent.parent / "references" / "feature-catalog" / "index.json"
WEIGHTS = {
    "name": 10,
    "aliases": 8,
    "businessScenarios": 7,
    "keywords": 5,
    "description": 4,
    "operation": 3,
    "resource": 3,
    "module": 2,
    "submodule": 2,
}


def load_index() -> dict:
    return json.loads(INDEX_PATH.read_text(encoding="utf-8"))


def normalize_tokens(text: str) -> list[str]:
    raw = text.replace("/", " ").replace("_", " ").replace("-", " ").replace("，", " ").replace("、", " ")
    return [token.strip().lower() for token in raw.split() if token.strip()]


def text_contains(field_value: str, token: str) -> bool:
    value = field_value.lower()
    return token in value


def score_entry(entry: dict, query: str) -> tuple[int, list[str]]:
    score = 0
    hits: list[str] = []
    query_lower = query.lower()
    tokens = normalize_tokens(query)

    for field, weight in WEIGHTS.items():
        raw_value = entry.get(field)
        values = raw_value if isinstance(raw_value, list) else [raw_value]
        matched_values: list[str] = []
        for value in values:
            if not isinstance(value, str):
                continue
            if query_lower and query_lower in value.lower():
                score += weight * 3
                matched_values.append(value)
                continue
            if tokens and all(text_contains(value, token) for token in tokens):
                score += weight * 2
                matched_values.append(value)
                continue
            token_matches = [token for token in tokens if text_contains(value, token)]
            if token_matches:
                score += weight * len(token_matches)
                matched_values.append(value)
        if matched_values:
            hits.append(f"{field}: {', '.join(matched_values[:2])}")

    return score, hits


def search(query: str, limit: int) -> list[dict]:
    data = load_index()
    features = data.get("features", [])
    ranked = []
    for entry in features:
        score, hits = score_entry(entry, query)
        if score <= 0:
            continue
        ranked.append(
            {
                "score": score,
                "hits": hits,
                "id": entry.get("id"),
                "name": entry.get("name"),
                "module": entry.get("module"),
                "submodule": entry.get("submodule"),
                "operation": entry.get("operation"),
                "resource": entry.get("resource"),
                "path": entry.get("path"),
                "description": entry.get("description"),
            }
        )
    ranked.sort(key=lambda item: (-item["score"], item.get("id") or ""))
    return ranked[:limit]


def main() -> None:
    parser = argparse.ArgumentParser(description="Search the XFT feature catalog index.")
    parser.add_argument("query", help="Business intent, interface name, or keywords to search")
    parser.add_argument("--limit", type=int, default=5, help="Maximum number of results to return")
    args = parser.parse_args()

    results = search(args.query, args.limit)
    print(json.dumps({"query": args.query, "count": len(results), "results": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
