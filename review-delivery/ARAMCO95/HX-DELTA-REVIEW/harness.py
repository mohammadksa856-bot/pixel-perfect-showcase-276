"""Independent re-execution harness: runs a Codex build_ledgers.py unchanged against b90fbc9 public inputs.
Stubs only extract_history (paths, period, PLANS) and pypdf (auditor-page text from private PDFs; ledger metadata only)."""
import sys, types, calendar, json
from pathlib import Path
d = Path(sys.argv[1]).resolve()
eh = types.ModuleType("extract_history")
eh.HERE = d; eh.ROOT = d; eh.ENGINE = Path("/home/user/mohammadksa856-bot/-market-agnostic-financial-data-engine-1"); eh.PRIVATE = None
exec(open(d.parent / "plans.txt").read(), eh.__dict__)
def period(kind,year,quarter=None):
    if kind=='fy':return dict(kind=kind,start=f'{year}-01-01',end=f'{year}-12-31',fiscal_year=year,fiscal_quarter=None)
    month=quarter*3 if quarter else 12
    end=f'{year}-{month:02d}-{calendar.monthrange(year,month)[1]}'
    start=None if kind=='instant' else (f'{year}-01-01' if kind=='ytd' else f'{year}-{(quarter-1)*3+1:02d}-01')
    return dict(kind=kind,start=start,end=end,fiscal_year=year,fiscal_quarter=quarter if kind!='instant' else None)
eh.period = period
man = json.loads((d/"SOURCE-MANIFEST.json").read_text())["documents"]
docs = man if isinstance(man, dict) else {r.get("source_id", r.get("key")): r for r in man}
eh.source_definitions = lambda: {k: dict(v, path=None, sha256=v.get("sha256", v.get("source_document_sha256"))) for k, v in docs.items()}
sys.modules["extract_history"] = eh
pp = types.ModuleType("pypdf")
class _P:
    def extract_text(self): return "audit opinion presents fairly 2021 2022 2023 2024 2025 [STUB: private PDF not read]"
class PdfReader:
    def __init__(self, path): self.pages = [_P()] * 400
pp.PdfReader = PdfReader
sys.modules["pypdf"] = pp
sys.path.insert(0, str(d))
import build_ledgers
build_ledgers.run()
