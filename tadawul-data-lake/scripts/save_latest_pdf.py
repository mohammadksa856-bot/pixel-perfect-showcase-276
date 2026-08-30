# -*- coding: utf-8 -*-
"""Finds the most recent javascript_tool result (a base64-encoded PDF
returned by browser fetch()), decodes it, and saves it to
data-lake/pdf_test/<ticker>.pdf. Usage: python save_latest_pdf.py <ticker>"""
import base64
import glob
import io
import json
import os
import re
import sys

TOOL_RESULTS_DIR = (
    r"C:\Users\Mohammed856\.claude\projects\C--Users-Mohammed856-OneDrive-Documents-GitHub-pixel-perfect-showcase-276"
    r"\245216c7-a274-4e8d-9a8a-5bdaaecbb56a\tool-results"
)
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data-lake", "pdf_test")

ticker = sys.argv[1]
files = glob.glob(os.path.join(TOOL_RESULTS_DIR, "mcp-Claude_Browser-javascript_tool-*.txt"))
path = max(files, key=os.path.getmtime)

raw = json.load(io.open(path, "r", encoding="utf-8"))
full_text = "".join(item.get("text", "") for item in raw)
full_text = re.sub(r"\n\n\(captured at origin.*\)\Z", "", full_text, flags=re.S)
b64 = json.loads(full_text)
pdf_bytes = base64.b64decode(b64)

out_path = os.path.join(OUT_DIR, f"{ticker}.pdf")
io.open(out_path, "wb").write(pdf_bytes)
print(f"{ticker}: saved {len(pdf_bytes)} bytes from {os.path.basename(path)} -> {out_path}")
