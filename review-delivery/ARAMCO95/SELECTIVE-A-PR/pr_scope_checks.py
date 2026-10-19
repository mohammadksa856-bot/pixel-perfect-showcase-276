"""PR-scope checks of the Selective Integration A PR candidate.

1. Provenance: every file vs the accepted integration commit (6445adf): kernel byte-identical; only the baseline and
   the test changed; the new files are the synthetic fixtures and their generator; nothing outside src/lib, the module
   declaration and tests; no main file modified.
2. History: the real engine page fixtures (tests/fixtures/codex-20261013) are in no commit of main..candidate.
3. Fixture audit: no value, source key, URL, hash, name or ticker of the three real fixtures appears in the synthetic
   fixtures or the new baseline; only example.invalid URLs; no secret patterns.
4. Regeneration: generate.ts reproduces the committed fixtures and baseline byte for byte.
5. Mutation testing: four deliberate kernel defects, run on the candidate and on the accepted commit, must be caught
   at least as well by the synthetic suite.
6. Rollback rehearsal on a throwaway worktree (merge --no-ff, revert -m 1): tree equals main.
Usage (repo root): python3 review-delivery/ARAMCO95/SELECTIVE-A-PR/pr_scope_checks.py <main-sha> <candidate-sha>
"""
import gzip, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ACCEPTED = "6445adf5814e0afa1cb272fd2fc7c8eabf5e0902"
REAL = ["2222", "1120", "8010"]
ALLOWED_CHANGED = {"src/lib/engine/publication-baseline.json", "tests/financial-projection.test.ts"}
NEW_FILES = {f"tests/fixtures/synthetic-projection/{s}-page.json" for s in ("9901", "9902", "9903")} | {
    "tests/fixtures/synthetic-projection/generate.ts", ".gitattributes"}
SECRETS = [r"-----BEGIN [A-Z ]*PRIVATE KEY-----", r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.", r"\bsk-[A-Za-z0-9]{20,}",
           r"\bAKIA[0-9A-Z]{16}\b", r"\bgh[pousr]_[A-Za-z0-9]{30,}", r"service_role", r"%PDF-",
           r"T1-SOURCE-REVIEW-RECEIPT|T1-AUTHORIZATION\.json|T1-INDEPENDENT-SOURCE-REVIEW"]
MUTATIONS = [
    ("M-a live mode uses the frozen baseline", "src/lib/engine/publication-gate.server.ts",
     'if (opts.mode === "frozen_design_fixture") {', "if (true) {"),
    ("M-b signatures not verified", "src/lib/engine/publication-gate.server.ts",
     "        return verifySignature(\n", "        return true || verifySignature(\n"),
    ("M-c a fiscal year end accepted from quarter_position", "src/lib/engine/statements.ts",
     '.filter((p) => fiscalDateKind(p.period_end, fyMonth) === "quarter_end")',
     '.filter((p) => fiscalDateKind(p.period_end, fyMonth) !== null)'),
    ("M-d any annual_position date accepted as Q4", "src/lib/engine/statements.ts",
     'fiscalDateKind(p.period_end, fyMonth) === "fy_end" &&', 'fiscalDateKind(p.period_end, fyMonth) !== "x" &&'),
]


def git(*a, cwd=REPO):
    return subprocess.run(["git", "-C", str(cwd), *a], capture_output=True, text=True, check=True).stdout


def blob(rev, path):
    r = subprocess.run(["git", "-C", str(REPO), "show", f"{rev}:{path}"], capture_output=True)
    return r.stdout if r.returncode == 0 else None


def real_tokens():
    """Distinct strings of the real fixtures that would identify them: values, keys, URLs, hashes, names, identifiers."""
    toks = set()
    for s in REAL:
        page = json.loads(gzip.decompress(blob(ACCEPTED, f"tests/fixtures/codex-20261013/{s}-page.json.gz")))
        def walk(x, k=None):
            if isinstance(x, dict):
                for kk, v in x.items():
                    walk(v, kk)
            elif isinstance(x, list):
                for v in x:
                    walk(v, k)
            elif isinstance(x, str):
                if k in ("value", "source_key", "source_url", "content_hash", "name", "isin", "company_id", "raw_value",
                         "artifact_sha256") and len(x) >= 6 and not re.fullmatch(r"[01](\.0+)?", x):
                    toks.add(x)
        walk(page)
    return toks


def mutate_and_test(tree: Path, test="tests/financial-projection.test.ts"):
    out = {}
    for name, path, old, new in [("none", None, None, None), *MUTATIONS]:
        f = tree / path if path else None
        saved = f.read_text() if f else None
        try:
            if f:
                if saved.count(old) != 1:
                    out[name] = {"error": "anchor not found once"}
                    continue
                f.write_text(saved.replace(old, new))
            r = subprocess.run(["bun", "test", test], cwd=tree, capture_output=True, text=True)
            t = r.stdout + r.stderr
            out[name] = {"pass": int(re.search(r"(\d+) pass", t).group(1)), "fail": int(re.search(r"(\d+) fail", t).group(1))}
        finally:
            if f:
                f.write_text(saved)
    return out


def main():
    base, head = sys.argv[1], sys.argv[2]
    out, checks = {"main": base, "candidate": head, "accepted": ACCEPTED}, []
    files = git("diff", "--name-only", base, head).split()
    prov = []
    for f in files:
        a, b = git("rev-parse", f"{head}:{f}").strip(), (git("rev-parse", f"{ACCEPTED}:{f}").strip() if blob(ACCEPTED, f) is not None else None)
        prov.append({"path": f, "state": "byte_identical_to_accepted" if a == b else ("changed" if b else "new")})
    out["files"] = prov
    checks.append(("kernel byte-identical; only baseline and test changed; new files are the synthetic fixtures and generator",
                   {p["path"] for p in prov if p["state"] == "changed"} == ALLOWED_CHANGED
                   and {p["path"] for p in prov if p["state"] == "new"} == NEW_FILES))
    checks.append(("only src/lib, the module declaration, tests and the scoped .gitattributes",
                   all(f.startswith(("src/lib/", "tests/")) or f in ("src/design-fixtures.d.ts", ".gitattributes") for f in files)))
    checks.append(("no existing main file modified", all(blob(base, f) is None for f in files)))
    commits = git("rev-list", f"{base}..{head}").split()
    in_history = [c for c in commits if any(l.split("\t")[1].startswith("tests/fixtures/codex-20261013/")
                                            for l in git("ls-tree", "-r", c).splitlines())]
    out["commits"] = commits
    checks.append(("real engine page fixtures absent from every candidate commit", not in_history))
    # fixture audit
    # Kernel vocabulary, not company data: companyKind() maps exactly these industry labels to bank / insurer.
    vocabulary = {"Banks", "Insurance"}
    toks = real_tokens() - vocabulary
    out["fixture_audit_vocabulary_allowed"] = sorted(vocabulary)
    texts = {p: blob(head, p).decode() for p in sorted(NEW_FILES | {"src/lib/engine/publication-baseline.json"})}
    hits = sorted({(p, t) for p, x in texts.items() for t in toks if t in x})
    urls = sorted({u for x in texts.values() for u in re.findall(r"https?://[^\s\"']+", x)})
    out["fixture_audit"] = {"real_tokens_checked": len(toks), "hits": hits[:20], "urls": urls[:5], "url_hosts": sorted({u.split("/")[2] for u in urls})}
    checks.append(("no real value, key, URL, hash or name in the synthetic fixtures or the new baseline", not hits))
    checks.append(("only example.invalid URLs", out["fixture_audit"]["url_hosts"] == ["example.invalid"]))
    sec = []
    for c in commits:
        for line in git("ls-tree", "-r", c).splitlines():
            oid, path = line.split()[2], line.split("\t")[1]
            if path in files:
                data = subprocess.run(["git", "-C", str(REPO), "cat-file", "blob", oid], capture_output=True).stdout.decode("utf-8", "replace")
                sec += [{"commit": c, "path": path, "pattern": p} for p in SECRETS if re.search(p, data)]
        msg = git("log", "-1", "--format=%B", c)
        sec += [{"commit": c, "pattern": p} for p in SECRETS if re.search(p, msg)]
    out["secret_hits"] = sec
    checks.append(("no secret or private pattern in candidate files, history or messages", not sec))
    # regeneration and mutations on a worktree of the candidate; mutations also on the accepted commit
    tmp = Path(tempfile.mkdtemp(prefix="pr-scope-"))
    trees = {"candidate": (tmp / "cand", head), "accepted": (tmp / "acc", ACCEPTED)}
    try:
        for t, rev in trees.values():
            git("worktree", "add", "--detach", str(t), rev)
            os.symlink(REPO / "node_modules", t / "node_modules")
        cand = trees["candidate"][0]
        before = {p: (cand / p).read_bytes() for p in texts}
        subprocess.run(["bun", "tests/fixtures/synthetic-projection/generate.ts"], cwd=cand, check=True, capture_output=True)
        out["regeneration_identical"] = all((cand / p).read_bytes() == b for p, b in before.items())
        checks.append(("generate.ts reproduces the committed fixtures and baseline byte for byte", out["regeneration_identical"]))
        out["mutations"] = {k: mutate_and_test(t) for k, (t, _) in trees.items()}
        m = out["mutations"]
        checks.append(("unmutated suites pass", m["candidate"]["none"]["fail"] == 0 and m["accepted"]["none"]["fail"] == 0))
        checks.append(("every mutation is caught by the candidate suite",
                       all(m["candidate"][n]["fail"] > 0 for n, *_ in MUTATIONS)))
        checks.append(("candidate catches at least what the accepted suite caught",
                       all(m["candidate"][n]["fail"] >= m["accepted"][n]["fail"] for n, *_ in MUTATIONS)))
    finally:
        for t, _ in trees.values():
            subprocess.run(["git", "-C", str(REPO), "worktree", "remove", "--force", str(t)], capture_output=True)
        shutil.rmtree(tmp, ignore_errors=True)
    # rollback rehearsal
    wt = Path(tempfile.mkdtemp(prefix="pr-rollback-")) / "wt"
    tmpb = "tmp/selective-a-pr-rollback-rehearsal"
    try:
        git("worktree", "add", "-b", tmpb, str(wt), base)
        w = lambda *a: subprocess.run(["git", "-C", str(wt), "-c", "user.email=rehearsal@invalid", "-c", "user.name=rehearsal", *a],  # noqa: E731
                                      capture_output=True, text=True, check=True).stdout
        w("merge", "--no-ff", "-m", "rehearsal", head)
        merged = w("rev-parse", "HEAD^{tree}").strip() == git("rev-parse", f"{head}^{{tree}}").strip()
        w("revert", "-m", "1", "--no-edit", "HEAD")
        restored = w("rev-parse", "HEAD^{tree}").strip() == git("rev-parse", f"{base}^{{tree}}").strip()
    finally:
        subprocess.run(["git", "-C", str(REPO), "worktree", "remove", "--force", str(wt)], capture_output=True)
        subprocess.run(["git", "-C", str(REPO), "branch", "-D", tmpb], capture_output=True)
        shutil.rmtree(wt.parent, ignore_errors=True)
    out["rollback"] = {"merge_tree_equals_candidate": merged, "revert_tree_equals_main": restored}
    checks.append(("rollback rehearsal restores main's tree", merged and restored))
    out["checks"] = [{"check": c, "pass": bool(ok)} for c, ok in checks]
    (HERE / "PR-SCOPE-CHECKS.json").write_text(json.dumps(out, indent=2, default=list) + "\n")
    for c, ok in checks:
        print("PASS" if ok else "FAIL", c)
    return 0 if all(ok for _, ok in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
