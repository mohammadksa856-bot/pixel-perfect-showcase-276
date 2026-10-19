"""T1 isolated-ingestion helpers. Never opens the original engine database for writing.

The engine is used only through an exported copy of commit b70254e (git archive), so neither the
original working tree nor its database file is touched; the original DB file is only hashed.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import tarfile
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ENGINE = Path(os.environ.get("ENGINE", "/home/user/mohammadksa856-bot/-market-agnostic-financial-data-engine-1"))
ENGINE_COMMIT = "b70254e"
ENGINE_DB_SHA256 = "2a749d7c8a051f2716128afac208a4a7e45679f2534fe81d29587f5490005867"
COMPANY_ID = "sa:2222"
Q3_2025_SHA256 = "f23cba61a0d743d4359050e6d915e8809e86e506432d740f01bd18eee2a7e6d2"
MANIFEST = HERE / "T1-MANIFEST.json"
IDENTITIES = HERE / "T1-IDENTITIES.json"
AUTHORIZATION = HERE / "T1-AUTHORIZATION.json"
SOURCE_RECEIPT = HERE / "T1-SOURCE-REVIEW-RECEIPT.json"
# Five Q3-2025 values only. Anything else in a manifest is a scope violation.
T1_SCOPE = {
    ("revenue", "quarter", "2025-07-01", "2025-09-30"),
    ("net_income", "quarter", "2025-07-01", "2025-09-30"),
    ("cash", "instant", None, "2025-09-30"),
    ("total_equity", "instant", None, "2025-09-30"),
    ("operating_cash_flow", "quarter", "2025-07-01", "2025-09-30"),
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def git(*args: str, cwd: Path = REPO) -> str:
    return subprocess.run(["git", "-C", str(cwd), *args], capture_output=True, check=True, text=True).stdout


def original_engine_state() -> dict:
    """Read-only proof of the original engine: commit, clean tree, DB hash. Hashing opens the file for reading only."""
    db = ENGINE / "data/financial.sqlite3"
    return dict(
        head=git("rev-parse", "HEAD", cwd=ENGINE).strip(),
        porcelain=git("status", "--porcelain", "--untracked-files=no", cwd=ENGINE),
        db_sha256=sha256_file(db),
        db_size=db.stat().st_size,
        db_mtime_ns=db.stat().st_mtime_ns,
    )


def export_engine(destination: Path) -> Path:
    """git archive of the engine commit, including the committed DB blob, into a disposable directory."""
    destination.mkdir(parents=True, exist_ok=True)
    tar = destination / "engine.tar"
    subprocess.run(["git", "-C", str(ENGINE), "archive", "--format=tar", "-o", str(tar), ENGINE_COMMIT], check=True)
    with tarfile.open(tar) as t:
        t.extractall(destination / "engine", filter="data")
    tar.unlink()
    root = destination / "engine"
    if sha256_file(root / "data/financial.sqlite3") != ENGINE_DB_SHA256:
        raise RuntimeError("exported engine DB does not match the pinned b70254e hash")
    return root


def engine_env(root: Path) -> dict:
    env = dict(os.environ, PYTHONPATH=str(root / "src"), PYTHONDONTWRITEBYTECODE="1")
    env.pop("FINENGINE_API_KEY", None)
    return env


def ro_uri(path: Path) -> str:
    return f"file:{path.resolve().as_posix()}?mode=ro&immutable=1"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def workdir(prefix: str) -> Path:
    return Path(tempfile.mkdtemp(prefix=prefix))
