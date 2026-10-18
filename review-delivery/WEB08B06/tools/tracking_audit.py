"""R05 / R05-A — consistency audit of recorded time fields in a JSONL tracking log.

Usage: tracking_audit.py <repo_dir> <commit> <path_in_repo> <out.json>

Compares each event's `ts` with the committer timestamp git reports for the commit that `git blame`
attributes the line to. Both are recorded metadata: `ts` was typed by the author, and git commit
timestamps can be set freely (GIT_COMMITTER_DATE, amend, rebase, clock skew). Neither is a trusted
time source, so the audit reports field inconsistencies only. It never infers when an event happened,
nor that it happened before or after any commit; event_time stays NOT_ESTABLISHED for every event.
"""
import datetime, hashlib, json, re, subprocess, sys

repo, commit, path, out = sys.argv[1:5]
git = lambda *a: subprocess.check_output(["git", "-C", repo, *a])
blob = git("show", f"{commit}:{path}")
porcelain = git("blame", "--line-porcelain", commit, "--", path).decode()

rows, cur = [], {}
for l in porcelain.splitlines():
    if re.match(r"^[0-9a-f]{40} ", l):
        p = l.split(); cur = {"commit": p[0], "line": int(p[2])}
    elif l.startswith("committer-time "):
        cur["ct"] = int(l.split()[1])
    elif l.startswith("\t"):
        cur["text"] = l[1:]; rows.append(cur)

def iso(t): return datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
def parse(ts):
    try: return datetime.datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
    except (TypeError, ValueError): return None

inconsistent, missing, consistent = [], 0, 0
for r in rows:
    ev = json.loads(r["text"])
    t = parse(ev.get("ts"))
    if t is None:
        missing += 1; continue
    diff = int((t - datetime.datetime.fromtimestamp(r["ct"], datetime.timezone.utc)).total_seconds())
    if diff > 0:
        inconsistent.append({
            "line": r["line"], "line_sha256": hashlib.sha256(r["text"].encode()).hexdigest(),
            "task": ev.get("task"), "event": ev.get("event"), "ts_as_written": ev["ts"],
            "git_commit": r["commit"], "git_commit_timestamp_observed": iso(r["ct"]),
            "field_relation": "ts_later_than_git_commit_timestamp", "field_difference_seconds": diff,
            "event_time": "NOT_ESTABLISHED"})
    else:
        consistent += 1

json.dump({
 "schema": "marefa-web08b06-tracking-corrections/2",
 "supersedes": "marefa-web08b06-tracking-corrections/1 (implementation 5050295): its field event_time_not_later_than treated the git commit timestamp as a provable bound; withdrawn",
 "audited_file": path, "audited_at_commit": commit,
 "audited_file_sha256": hashlib.sha256(blob).hexdigest(), "audited_lines": len(rows),
 "evidence_status": {
  "ts": "recorded metadata typed by the author agent as estimated narrative times; no clock was read",
  "git_commit_timestamp_observed": "git committer timestamp as reported by git; mutable metadata (GIT_COMMITTER_DATE, amend, rebase, clock skew); not a trusted timestamp and not evidence of when an event happened",
  "event_time": "NOT_ESTABLISHED for every audited event: no independent time evidence exists"},
 "finding": "Inconsistency between two recorded time fields: for the listed lines, ts is later than the git commit timestamp observed for the commit that recorded the line. This shows the fields disagree; it does not establish the true time of any event or its order relative to any commit.",
 "not_inferred": "No conclusion that an event happened before, after or at any commit timestamp, in either direction; lines without the inconsistency are not thereby confirmed.",
 "correction": "Append-only: original lines unchanged; this file and an appended CHANGELOG correction event record the inconsistency. No replacement timestamp is invented.",
 "forward_rule": "New entries carry ts = recorded_at from the system clock (date -u) at authoring, with time_source; this is also recorded metadata, not independent proof.",
 "central_board": "docs/PROJECT_EXECUTION_BOARD_ROOT_20261011_v1.json is not in this repository and was not updated by the author.",
 "counts": {"ts_later_than_git_commit_timestamp": len(inconsistent),
            "of_which_difference_over_24h": sum(1 for a in inconsistent if a["field_difference_seconds"] > 86400),
            "ts_equal_or_earlier_than_git_commit_timestamp": consistent, "ts_missing_or_unparseable": missing},
 "inconsistencies": inconsistent,
}, open(out, "w"), ensure_ascii=False, indent=1)
open(out, "a").write("\n")
print(len(rows), len(inconsistent))
