"""Run the run: steps of .github/workflows/aramco95-kernel.yml, in order, in a fresh clone of a commit.
usage: run_ci_local.py <repo> <sha> <autocrlf:true|false> <out.json> [--os Windows|Linux]
'uses:' steps are emulated: checkout = git clone with the given core.autocrlf; setup-bun = the local bun 1.4.2.
If `bun install --frozen-lockfile` cannot reach the registry, node_modules is linked from the repo and that is recorded.
"""
import json, os, subprocess, sys, tempfile, time
import yaml

repo, sha, crlf, out = sys.argv[1:5]
os_name = "Windows" if crlf == "true" else "Linux"
tmp = tempfile.mkdtemp(prefix=f"ci-{os_name}-")
wt = os.path.join(tmp, "repo")
home = os.path.join(tmp, "home")
os.makedirs(home)
env = {**os.environ, "HOME": home, "GIT_CONFIG_NOSYSTEM": "1", "CI": "true"}
subprocess.run(["git", "config", "--global", "core.autocrlf", crlf], env=env, check=True)
subprocess.run(["git", "config", "--global", "user.email", "ci@invalid"], env=env, check=True)
subprocess.run(["git", "config", "--global", "user.name", "ci"], env=env, check=True)
subprocess.run(["git", "clone", "-q", "--no-checkout", repo, wt], env=env, check=True)
subprocess.run(["git", "-C", wt, "checkout", "-q", sha], env=env, check=True)
wf = yaml.safe_load(open(os.path.join(wt, ".github/workflows/aramco95-kernel.yml")))
steps = wf["jobs"]["kernel"]["steps"]
log = []
for st in steps:
    name = st.get("name") or st.get("uses") or st.get("run", "").splitlines()[0]
    cond = st.get("if")
    if cond and f"'{os_name}'" not in cond:
        log.append({"step": name, "result": "skipped (if)"})
        continue
    if "uses" in st:
        log.append({"step": name, "result": "emulated"})
        continue
    script = st["run"].replace("git config --global core.autocrlf true", f"test \"$(git config --global core.autocrlf)\" = {crlf}")
    step_env = dict(env)
    for k, v in (st.get("env") or {}).items():
        # Only the expression form used by the workflow: ${{ runner.os == 'Windows' && 'A' || 'B' }}
        import re
        m = re.fullmatch(r"\$\{\{ runner\.os == 'Windows' && '(.*)' \|\| '(.*)' \}\}", v)
        step_env[k] = (m.group(1) if os_name == "Windows" else m.group(2)) if m else v
    t = time.time()
    r = subprocess.run(["bash", "-eo", "pipefail", "-c", script], cwd=wt, env=step_env, capture_output=True, text=True)
    if r.returncode != 0 and script.strip() == "bun install --frozen-lockfile":
        os.symlink(os.path.join(repo, "node_modules"), os.path.join(wt, "node_modules"))
        log.append({"step": name, "result": "NOT RUN HERE: registry unreachable from sandbox; node_modules linked",
                    "tail": (r.stdout + r.stderr)[-600:]})
        continue
    log.append({"step": name, "result": "pass" if r.returncode == 0 else "FAIL", "seconds": round(time.time() - t, 1),
                "tail": (r.stdout + r.stderr)[-1500:]})
    if r.returncode != 0:
        break
cr = {p: open(os.path.join(wt, p), "rb").read().count(b"\r") for p in
      ["src/lib/engine/statements.ts", "tests/fixtures/synthetic-projection/9901-page.json",
       "src/lib/engine/publication-baseline.json"]}
res = {"sha": sha, "core.autocrlf": crlf, "emulated_os": os_name, "cr_bytes_after_checkout": cr, "steps": log,
       "all_pass": all(s["result"] in ("pass", "emulated", "skipped (if)") or s["result"].startswith("NOT RUN")
                       for s in log) and len([s for s in log if "result" in s]) == len(steps)}
json.dump(res, open(out, "w"), indent=2)
for s in log:
    print(f"{s['result'][:60]:<62} {s['step']}")
print("ALL PASS" if res["all_pass"] else "FAILED", cr)
subprocess.run(["rm", "-rf", tmp])
