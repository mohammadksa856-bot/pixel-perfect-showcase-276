# -*- coding: utf-8 -*-
"""Prints the next N tickers (comma-separated, quoted for JS array literal)
not yet present in all_raw_extracts.json. Usage: python next_batch.py [N]"""
import io
import json
import os
import sys

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data-lake", "raw")
ALL_TICKERS_PATH = os.path.join(RAW_DIR, "all_tickers.json")
ACCUM_PATH = os.path.join(RAW_DIR, "all_raw_extracts.json")

n = int(sys.argv[1]) if len(sys.argv) > 1 else 25
all_tickers = json.loads(io.open(ALL_TICKERS_PATH, "r", encoding="utf-8").read())
accum = {}
if os.path.exists(ACCUM_PATH):
    accum = json.loads(io.open(ACCUM_PATH, "r", encoding="utf-8").read())

remaining = [t for t in all_tickers if t not in accum]
batch = remaining[:n]
print(f"remaining_before={len(remaining)}")
print("','".join(batch))
