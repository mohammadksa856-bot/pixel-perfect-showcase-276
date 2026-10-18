"""Export SCENARIOS-v2.json (event 122) from $OUT/plan95_v2.json: scenarios, minimum licensed counts, exclusion review."""
import json, os
O = os.environ["OUT"]; H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(f"{O}/plan95_v2.json"))
sc = {k: {x: v[x] for x in v if x != "chosen"} for k, v in d["scenarios"].items()}
json.dump({"note": "Conditional scenarios, not data approval. Classes and exclusion verdicts are a planning classification for review; no exclusion or licence is accepted.",
           "codex_reported_case": {"source": "Codex review aa2fd59 (local to Codex; not read here)", "fields": 199, "licensed_class_C": 36, "weighted": 95.01925,
                                   "status": "conditional; not reproduced because Codex's classification file is not available"},
           "scenarios": sc, "minimum_licensed": {k: {x: v[x] for x in v} for k, v in d["min_licensed"].items()},
           "exclusion_candidates": d["exclusion_candidates"], "not_eligible": d["not_eligible"]},
          open(f"{H}/SCENARIOS-v2.json", "w"), ensure_ascii=False, indent=1)
print("ok", len(d["exclusion_candidates"]))
