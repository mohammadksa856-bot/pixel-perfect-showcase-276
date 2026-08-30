# -*- coding: utf-8 -*-
"""
Finds the most recently saved javascript_tool result file (the harness
auto-saves oversized tool outputs there), unwraps the tool's text
envelope (a JSON-quoted string followed by a "(captured at origin ...)"
suffix, sometimes split across multiple text parts), and merges the
parsed ticker->data records into the running raw-extract accumulator
file, all_raw_extracts.json.

Usage: python ingest_batch_result.py
"""
import glob
import io
import json
import os
import re

TOOL_RESULTS_DIR = (
    r"C:\Users\Mohammed856\.claude\projects\C--Users-Mohammed856-OneDrive-Documents-GitHub-pixel-perfect-showcase-276"
    r"\245216c7-a274-4e8d-9a8a-5bdaaecbb56a\tool-results"
)
ACCUM_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data-lake", "raw", "all_raw_extracts.json"
)


def latest_result_file():
    files = glob.glob(os.path.join(TOOL_RESULTS_DIR, "mcp-Claude_Browser-javascript_tool-*.txt"))
    if not files:
        raise SystemExit("No javascript_tool result files found.")
    return max(files, key=os.path.getmtime)


def parse_result_file(path):
    raw = json.load(io.open(path, "r", encoding="utf-8"))
    full_text = "".join(item.get("text", "") for item in raw)
    full_text = re.sub(r"\n\n\(captured at origin.*\)\Z", "", full_text, flags=re.S)
    inner = json.loads(full_text)  # unwrap the quoted-string envelope
    return json.loads(inner)  # the actual JS return value (an array)


def main():
    path = latest_result_file()
    data = parse_result_file(path)

    accum = {}
    if os.path.exists(ACCUM_PATH):
        accum = json.loads(io.open(ACCUM_PATH, "r", encoding="utf-8").read())

    added, failed = 0, []
    for rec in data:
        ticker = rec["ticker"]
        if rec.get("ok"):
            accum[ticker] = rec
            added += 1
        else:
            failed.append(ticker)

    io.open(ACCUM_PATH, "w", encoding="utf-8").write(json.dumps(accum, ensure_ascii=False))
    print(f"Ingested {added} tickers from {os.path.basename(path)}. "
          f"Failed: {failed}. Running total: {len(accum)}")


if __name__ == "__main__":
    main()
