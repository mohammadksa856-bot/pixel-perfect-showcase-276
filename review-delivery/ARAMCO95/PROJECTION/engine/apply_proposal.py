"""Apply the quarter-end balance proposal to an EXPORTED engine tree (never the original working tree).

quarter-position.patch is the single source of the change; this script only checks and applies it with git apply.
It changes src/finengine/query.py of b70254e only:
  * period_history(..., quarter_ends_only=True): instant periods whose date is a real calendar date on the last
    day of a fiscal quarter-end month of the company's fiscal year (February 28 or 29 by leap year), excluding the
    fiscal year end (which stays in annual_position); checked before the period limit; exclusive with annual_only.
  * company_page: new additive key sections.financials.history.quarter_position (12 periods, instant identities).
    Every existing key and value is unchanged; contract_version is unchanged because the change is additive.
Usage: python3 apply_proposal.py <exported-engine-root>
"""
import subprocess
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
if (root / ".git").exists():
    raise SystemExit("refusing to patch a git working tree; export the engine with git archive first")
patch = Path(__file__).resolve().parent / "quarter-position.patch"
subprocess.run(["git", "apply", "--check", str(patch)], cwd=root, check=True)
subprocess.run(["git", "apply", str(patch)], cwd=root, check=True)
print(f"applied {patch.name} to {root}")
