"""A-PR-R01 line-ending checks. Fresh clones of a commit with core.autocrlf=true (Windows default), false and input;
in each: CR count and sha256 of the four sha-pinned files right after checkout, the full test suite BEFORE any
generator run, then the generator twice (git status and hashes after each), then the suite again. Also reproduces the
failure on the previous commit, and lists every path of main and of the candidate matched by .gitattributes.
Native Windows is not available here: core.autocrlf=true reproduces Git for Windows' checkout conversion.
Usage (repo root): python3 review-delivery/ARAMCO95/SELECTIVE-A-PR-R01/eol_checks.py <main> <before> <candidate>
"""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
PINNED = [f"tests/fixtures/synthetic-projection/{s}-page.json" for s in ("9901", "9902", "9903")] + ["src/lib/engine/publication-baseline.json"]
OTHER = ["src/lib/engine/statements.ts", "tests/financial-projection.test.ts"]


def run(cmd, cwd):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)


def suite(d):
    t = run(["bun", "test"], d)
    t = t.stdout + t.stderr
    return {"pass": int(re.search(r"(\d+) pass", t).group(1)), "fail": int(re.search(r"(\d+) fail", t).group(1)),
            "failing": re.findall(r"^\(fail\) (.*?)(?: \[|$)", t, re.M)}


def state(d):
    return {p: {"cr": (d / p).read_bytes().count(b"\r"), "sha256": hashlib.sha256((d / p).read_bytes()).hexdigest()} for p in PINNED}


def clone(rev, mode, dest):
    subprocess.run(["git", "clone", "-q", "-c", f"core.autocrlf={mode}", "--no-checkout", str(REPO), str(dest)], check=True)
    subprocess.run(["git", "-C", str(dest), "-c", f"core.autocrlf={mode}", "checkout", "-q", rev], check=True)
    os.symlink(REPO / "node_modules", dest / "node_modules")


def main():
    base, before, cand = sys.argv[1:4]
    tmp = Path(tempfile.mkdtemp(prefix="eol-"))
    out, checks = {"main": base, "before": before, "candidate": cand, "windows_emulation": "core.autocrlf=true"}, []
    try:
        d = tmp / "before-crlf"
        clone(before, "true", d)
        out["before_commit_crlf"] = {"files": state(d), "suite": suite(d)}
        b = json.loads((d / "src/lib/engine/publication-baseline.json").read_bytes())
        out["candidate_pins"] = None
        for mode in ("true", "false", "input"):
            d = tmp / f"cand-{mode}"
            clone(cand, mode, d)
            r = {"files_after_checkout": state(d),
                 "other_files_cr": {p: (d / p).read_bytes().count(b"\r") for p in OTHER},
                 "suite_before_generator": suite(d), "generator_runs": []}
            pins = json.loads((d / "src/lib/engine/publication-baseline.json").read_bytes())["fixtures"]
            r["pins_match_checkout"] = all(r["files_after_checkout"][f"tests/fixtures/synthetic-projection/{s}-page.json"]["sha256"] == h
                                           for s, h in pins.items())
            for _ in range(2):
                g = run(["bun", "tests/fixtures/synthetic-projection/generate.ts"], d)
                r["generator_runs"].append({"exit": g.returncode, "git_status": run(["git", "status", "--porcelain"], d).stdout.splitlines(),
                                            "files": state(d)})
            r["suite_after_generator"] = suite(d)
            out[f"autocrlf_{mode}"] = r
        out["candidate_pins"] = pins
        attrs = lambda rev: [l for l in subprocess.run(  # noqa: E731
            f"git -C {REPO} ls-tree -r --name-only {rev} | git -C {REPO} check-attr --source {rev} --stdin eol",
            shell=True, capture_output=True, text=True).stdout.splitlines() if not l.endswith(": unspecified")]
        out["gitattributes_matches"] = {"main_paths": attrs(base), "candidate_paths": attrs(cand)}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    bc = out["before_commit_crlf"]
    checks.append(("previous commit reproduces A-PR-R01 on a CRLF checkout", bc["suite"]["fail"] > 0
                   and all(v["cr"] > 0 for v in bc["files"].values())))
    lf = out["autocrlf_false"]["files_after_checkout"]
    for mode in ("true", "false", "input"):
        r = out[f"autocrlf_{mode}"]
        checks.append((f"autocrlf={mode}: pinned files LF and identical to LF checkout right after checkout",
                       all(v["cr"] == 0 for v in r["files_after_checkout"].values()) and r["files_after_checkout"] == lf))
        checks.append((f"autocrlf={mode}: baseline pins equal the checked-out fixture hashes", r["pins_match_checkout"]))
        checks.append((f"autocrlf={mode}: 34/34 before any generator run", r["suite_before_generator"] == {"pass": 34, "fail": 0, "failing": []}))
        checks.append((f"autocrlf={mode}: generator twice, byte-identical, git status clean",
                       all(g["exit"] == 0 and not g["git_status"] and g["files"] == lf for g in r["generator_runs"])))
        checks.append((f"autocrlf={mode}: 34/34 after generator", r["suite_after_generator"]["fail"] == 0 and r["suite_after_generator"]["pass"] == 34))
    checks.append(("CRLF emulation active (other text files are CRLF under autocrlf=true)",
                   all(v > 0 for v in out["autocrlf_true"]["other_files_cr"].values())))
    checks.append((".gitattributes matches no path of main and exactly the four pinned files of the candidate",
                   not out["gitattributes_matches"]["main_paths"]
                   and sorted(l.split(":")[0] for l in out["gitattributes_matches"]["candidate_paths"]) == sorted(PINNED)))
    out["checks"] = [{"check": c, "pass": bool(ok)} for c, ok in checks]
    (HERE / "EOL-CHECKS.json").write_text(json.dumps(out, indent=2) + "\n")
    for c, ok in checks:
        print("PASS" if ok else "FAIL", c)
    return 0 if all(ok for _, ok in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
