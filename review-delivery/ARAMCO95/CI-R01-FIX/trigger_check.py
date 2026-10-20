"""Evaluates the `on:` block of two versions of .github/workflows/aramco95-kernel.yml against concrete events.
Model of GitHub's documented filter semantics for the keys this workflow uses (pull_request[.branches/.paths],
push.branches[.paths], workflow_dispatch): a path filter runs the workflow when at least one changed file matches;
no `paths` key means every change matches; `*` matches within a path segment, `**` across segments.
This is a model, not GitHub itself; the real proof is a run on GitHub.
usage (repo root): python3 trigger_check.py <old-ref> <new-ref> <out.json>
"""
import json, re, subprocess, sys
import yaml


def glob_re(pattern):
    out, i = "", 0
    while i < len(pattern):
        if pattern.startswith("**", i):
            out, i = out + ".*", i + 2
        elif pattern[i] == "*":
            out, i = out + "[^/]*", i + 1
        else:
            out, i = out + re.escape(pattern[i]), i + 1
    return re.compile(out + r"\Z")


def runs(on, event, branch, files):
    if event not in on:
        return False
    cfg = on[event] or {}
    if "branches" in cfg and not any(glob_re(b).match(branch) for b in cfg["branches"]):
        return False
    if "paths" in cfg and not any(glob_re(p).match(f) for f in files for p in cfg["paths"]):
        return False
    return True


def on_block(ref):
    wf = yaml.safe_load(subprocess.run(["git", "show", f"{ref}:.github/workflows/aramco95-kernel.yml"],
                                       capture_output=True, text=True, check=True).stdout)
    return wf.get("on", wf.get(True))  # PyYAML reads the bare key `on` as True


def diff(a, b):
    return subprocess.run(["git", "diff", "--name-only", a, b], capture_output=True, text=True, check=True).stdout.split()


old_ref, new_ref, out = sys.argv[1:4]
old, new = on_block(old_ref), on_block(new_ref)
PR4, MAIN = "c43f6ba0fa5523b67bf2c18ba6808a3fb95eb855", "c4882ea02c60ec950e92932d61cb1f1a7b4e743e"
scenarios = [
    # (name, event, target branch: PR base or pushed branch, changed files)
    ("PR edits vite.config.ts only (not in the old filters)", "pull_request", "main", ["vite.config.ts"]),
    ("PR edits the server entry src/server.ts only", "pull_request", "main", ["src/server.ts"]),
    ("PR adds a route that consumes the kernel", "pull_request", "main", ["src/routes/company.$symbol.tsx"]),
    ("PR edits README.md only", "pull_request", "main", ["README.md"]),
    ("PR to PR #4's branch edits vite.config.ts", "pull_request", "claude/aramco95-selective-integration-a-pr", ["vite.config.ts"]),
    ("PR #5 itself (its real diff)", "pull_request", "claude/aramco95-selective-integration-a-pr", diff(PR4, new_ref)),
    ("PR #4 + CI to main (real diff main..new)", "pull_request", "main", diff(MAIN, new_ref)),
    ("push to main edits vite.config.ts", "push", "main", ["vite.config.ts"]),
    ("push to main edits README.md", "push", "main", ["README.md"]),
    ("push to a feature branch edits the kernel", "push", "feature/x", ["src/lib/engine/statements.ts"]),
    ("manual run", "workflow_dispatch", "main", []),
]
expected_new = {"push to a feature branch edits the kernel": False}
rows = []
for name, ev, br, files in scenarios:
    o, n = runs(old, ev, br, files), runs(new, ev, br, files)
    rows.append({"scenario": name, "event": ev, "branch": br, "files": files[:6], "old_runs": o, "new_runs": n,
                 "new_as_expected": n == expected_new.get(name, True)})
checks = {
    "new on-block has no paths filter": all("paths" not in (new[e] or {}) for e in ("pull_request", "push")),
    "new on-block has no pull_request branch filter": "branches" not in (new["pull_request"] or {}),
    "push is limited to main": (new["push"] or {}).get("branches") == ["main"],
    "workflow_dispatch kept": "workflow_dispatch" in new,
    "every scenario behaves as expected under the new triggers": all(r["new_as_expected"] for r in rows),
    "at least one scenario the old filters skipped now runs": any(not r["old_runs"] and r["new_runs"] for r in rows),
}
json.dump({"old_ref": old_ref, "new_ref": new_ref, "scenarios": rows, "checks": checks}, open(out, "w"), indent=2)
for r in rows:
    print(f"old={'run ' if r['old_runs'] else 'skip'} new={'run ' if r['new_runs'] else 'skip'}  {r['scenario']}")
for c, ok in checks.items():
    print("PASS" if ok else "FAIL", c)
sys.exit(0 if all(checks.values()) else 1)
