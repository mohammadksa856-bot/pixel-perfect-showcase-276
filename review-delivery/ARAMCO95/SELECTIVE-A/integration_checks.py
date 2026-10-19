"""Static checks of the selective integration branch: provenance of every file, secrets and private data in the files
and the branch history, and a rollback rehearsal on a throwaway worktree (never on main).
Usage (repo root): python3 review-delivery/ARAMCO95/SELECTIVE-A/integration_checks.py <main-sha> <integration-sha>
"""
import gzip, json, re, shutil, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ACCEPTED = "6c88655638c14550f8fad36e09228bcb483d06d3"
git = lambda *a: subprocess.run(["git", "-C", str(REPO), *a], capture_output=True, text=True, check=True).stdout  # noqa: E731
PATTERNS = {
    "private_key_block": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    "jwt_like": r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.",
    "openai_or_stripe_key": r"\bsk-[A-Za-z0-9]{20,}",
    "aws_key": r"\bAKIA[0-9A-Z]{16}\b",
    "github_token": r"\bgh[pousr]_[A-Za-z0-9]{30,}",
    "supabase_service_role_value": r"service_role\"?\s*[:=]\s*\"ey",
    "assigned_api_key": r"(FINENGINE_API_KEY|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*['\"][^'\"]+",
    "t1_private_files": r"T1-SOURCE-REVIEW-RECEIPT\.json|T1-AUTHORIZATION\.json|T1-INDEPENDENT-SOURCE-REVIEW_AR\.md",
    "pdf_magic": r"%PDF-",
}


def main():
    base, head = sys.argv[1], sys.argv[2]
    out = {"main": base, "integration": head}
    files = git("diff", "--name-only", base, head).split()
    out["files"] = []
    for f in files:
        same = git("rev-parse", f"{head}:{f}").strip() == git("rev-parse", f"{ACCEPTED}:{f}").strip()
        out["files"].append({"path": f, "byte_identical_to_accepted": same})
    out["outside_allowed_dirs"] = [f for f in files if not f.startswith(("src/lib/", "src/design-fixtures.d.ts", "tests/"))]
    out["touches_main_files"] = [f for f in files if subprocess.run(["git", "-C", str(REPO), "cat-file", "-e", f"{base}:{f}"],
                                                                       capture_output=True).returncode == 0]
    hits = []
    commits = git("rev-list", f"{base}..{head}").split()
    blobs = set()
    for c in commits:
        for line in git("ls-tree", "-r", c).splitlines():
            meta, path = line.split("\t", 1)
            if path in files:
                blobs.add((meta.split()[2], path))
    for oid, path in sorted(blobs):
        data = subprocess.run(["git", "-C", str(REPO), "cat-file", "blob", oid], capture_output=True, check=True).stdout
        if path.endswith(".gz"):
            data = gzip.decompress(data)
        text = data.decode("utf-8", "replace")
        for name, pat in PATTERNS.items():
            if re.search(pat, text):
                hits.append({"path": path, "blob": oid, "pattern": name})
    for c in commits:
        msg = git("log", "-1", "--format=%B", c)
        for name, pat in PATTERNS.items():
            if re.search(pat, msg):
                hits.append({"commit": c, "pattern": name})
    out["commits_in_range"] = commits
    out["secret_or_private_hits"] = hits
    # rollback rehearsal on a throwaway worktree and branch, deleted afterwards
    wt = Path(tempfile.mkdtemp(prefix="rollback-")) / "wt"
    tmpb = "tmp/selective-a-rollback-rehearsal"
    try:
        git("worktree", "add", "-b", tmpb, str(wt), base)
        w = lambda *a: subprocess.run(["git", "-C", str(wt), "-c", "user.email=rehearsal@invalid", "-c", "user.name=rehearsal", *a],  # noqa: E731
                                      capture_output=True, text=True, check=True).stdout
        w("merge", "--no-ff", "-m", "rehearsal merge", head)
        merged_tree = w("rev-parse", "HEAD^{tree}").strip()
        w("revert", "-m", "1", "--no-edit", "HEAD")
        out["rollback"] = {"merge_tree_equals_integration_tree": merged_tree == git("rev-parse", f"{head}^{{tree}}").strip(),
                           "reverted_tree_equals_main_tree": w("rev-parse", "HEAD^{tree}").strip() == git("rev-parse", f"{base}^{{tree}}").strip(),
                           "method": "git merge --no-ff, then git revert -m 1 (no reset, no force-push)"}
    finally:
        subprocess.run(["git", "-C", str(REPO), "worktree", "remove", "--force", str(wt)], capture_output=True)
        subprocess.run(["git", "-C", str(REPO), "branch", "-D", tmpb], capture_output=True)
        shutil.rmtree(wt.parent, ignore_errors=True)
    out["rehearsal_branch_removed"] = subprocess.run(["git", "-C", str(REPO), "rev-parse", "--verify", tmpb], capture_output=True).returncode != 0
    checks = [("every file byte-identical to the accepted delivery", all(f["byte_identical_to_accepted"] for f in out["files"])),
              ("only src/lib, the module declaration and tests", not out["outside_allowed_dirs"]),
              ("no existing main file modified", not out["touches_main_files"]),
              ("no secret or private data in files or history", not hits),
              ("rollback rehearsal restores main's tree", out["rollback"]["reverted_tree_equals_main_tree"] and out["rollback"]["merge_tree_equals_integration_tree"]),
              ("rehearsal branch removed", out["rehearsal_branch_removed"])]
    out["checks"] = [{"check": c, "pass": bool(ok)} for c, ok in checks]
    (HERE / "INTEGRATION-CHECKS.json").write_text(json.dumps(out, indent=2) + "\n")
    for c, ok in checks:
        print("PASS" if ok else "FAIL", c)
    return 0 if all(ok for _, ok in checks) else 1


if __name__ == "__main__":
    sys.exit(main())
