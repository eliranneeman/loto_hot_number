#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Download official Pais Lotto results and keep the current-method archive."""

from __future__ import annotations

import json
import urllib.request
from collections import Counter
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_URL = "https://www.pais.co.il/Lotto/lotto_resultsDownload.aspx"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Official current method: 6 of 37 + strong 1-7, from mid-May 2011.
CURRENT_METHOD_START = date(2011, 5, 14)


def download_csv() -> str:
    request = urllib.request.Request(CSV_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read()
    for encoding in ("cp1255", "windows-1255", "utf-8-sig", "utf-8"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1")


def parse_draws(csv_text: str) -> list[dict]:
    draws = []
    for line in csv_text.splitlines()[1:]:
        parts = [part.strip() for part in line.split(",")]
        if len(parts) < 9:
            continue
        try:
            draw_id = int(parts[0])
            draw_date = datetime.strptime(parts[1], "%d/%m/%Y").date()
            numbers = [int(parts[i]) for i in range(2, 8)]
            strong = int(parts[8])
        except ValueError:
            continue
        draws.append(
            {
                "id": draw_id,
                "date": draw_date.isoformat(),
                "dateDisplay": draw_date.strftime("%d/%m/%Y"),
                "numbers": numbers,
                "strong": strong,
            }
        )
    draws.sort(key=lambda item: (item["date"], item["id"]), reverse=True)
    return draws


def is_current_method(draw: dict) -> bool:
    draw_date = date.fromisoformat(draw["date"])
    numbers = draw["numbers"]
    strong = draw["strong"]
    return (
        draw_date >= CURRENT_METHOD_START
        and len(numbers) == 6
        and len(set(numbers)) == 6
        and all(1 <= number <= 37 for number in numbers)
        and 1 <= strong <= 7
    )


def compute_stats(draws: list[dict]) -> dict:
    regular = Counter()
    strong = Counter()
    for draw in draws:
        regular.update(draw["numbers"])
        strong[draw["strong"]] += 1
    return {
        "regular_stats": {str(i): int(regular.get(i, 0)) for i in range(1, 38)},
        "strong_stats": {str(i): int(strong.get(i, 0)) for i in range(1, 8)},
        "last_updated": datetime.now().isoformat(),
        "total_draws": len(draws),
    }


def main() -> int:
    print("Downloading official Pais Lotto archive...")
    csv_text = download_csv()
    all_draws = parse_draws(csv_text)
    current = [draw for draw in all_draws if is_current_method(draw)]
    if not current:
        print("No current-method draws found")
        return 1

    stats = compute_stats(current)
    payload = {
        "method": "current",
        "methodLabel": "6 מתוך 37 + מספר חזק 1-7",
        "startedOn": CURRENT_METHOD_START.isoformat(),
        "source": CSV_URL,
        "lastUpdated": datetime.now().isoformat(),
        "totalDraws": len(current),
        "lastDraw": current[0],
        "results": current,
        "stats": stats,
    }

    results_path = ROOT / "lottery_results.json"
    stats_path = ROOT / "lottery_stats.json"
    results_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    stats_path.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"current-method draws: {len(current)}")
    print(f"latest: #{current[0]['id']} {current[0]['dateDisplay']} {current[0]['numbers']} + {current[0]['strong']}")
    print(f"oldest: #{current[-1]['id']} {current[-1]['dateDisplay']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
