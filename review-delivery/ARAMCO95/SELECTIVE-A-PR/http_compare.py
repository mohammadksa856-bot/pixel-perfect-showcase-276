"""Start `vite dev` on 127.0.0.1 with default env (no preview flags) and fetch public routes; write status/size/sha.
Usage: python3 http_compare.py <repo> <out.json>"""
import hashlib, json, os, re, signal, socket, subprocess, sys, time, urllib.request
repo, out = sys.argv[1], sys.argv[2]
ROUTES = ["/about", "/privacy", "/terms", "/contact", "/markets", "/companies", "/research", "/knowledge", "/sectors",
          "/search", "/", "/preview/web-v1", "/preview/companies/2222", "/preview/web-v1/companies/2222", "/api/does-not-exist"]
s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
env = {k: v for k, v in os.environ.items() if not k.startswith(("MAREFA_", "VERCEL_", "ENGINE_", "FINENGINE_", "WEB_V1_"))}
p = subprocess.Popen(["npx", "vite", "dev", "--host", "127.0.0.1", "--port", str(port), "--strictPort"], cwd=repo, env=env,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
res = {}
try:
    for _ in range(120):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/about", timeout=60); break
        except urllib.error.HTTPError:
            break
        except Exception:
            time.sleep(1)
    for r in ROUTES:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}{r}", timeout=60) as x:
                body = x.read(); st = x.status
        except urllib.error.HTTPError as e:
            body = e.read(); st = e.code
        except Exception as e:
            res[r] = {"error": type(e).__name__}; continue
        # dev HTML carries per-run ids (vite client, timestamps); normalize them before hashing
        norm = re.sub(rb"\?(t|v)=[0-9a-f]+", b"", body)
        norm = re.sub(rb"[0-9]{13}", b"", norm)
        res[r] = {"status": st, "bytes": len(body), "sha256_normalized": hashlib.sha256(norm).hexdigest()}
finally:
    os.killpg(p.pid, signal.SIGTERM)
    try: p.wait(20)
    except subprocess.TimeoutExpired: os.killpg(p.pid, signal.SIGKILL)
json.dump(res, open(out, "w"), indent=1)
print(json.dumps(res))
