// T1: run the site's own buildCompanyPreview on an engine /page payload from the isolated copy and report how each
// T1 identity would render. Local only; no fixture, no W0 overlay, no change to any trust rule.
// Usage: bun review-delivery/ARAMCO95/T1-ISOLATED/preview_check.ts <page.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import {
  buildCompanyPreview,
  contractProblems,
  type EnginePage,
} from "../../../src/lib/engine/company-preview";

const [pagePath, outPath] = process.argv.slice(2);
const page = JSON.parse(readFileSync(pagePath!, "utf8")) as EnginePage;
const T1 = ["revenue", "net_income", "cash", "total_equity", "operating_cash_flow"];
const END = "2025-09-30";
const problems = contractProblems(page);
const out: Record<string, unknown> = { contract_problems: problems };
if (!problems.length) {
  const p = buildCompanyPreview(page);
  out["cells"] = p.statements.flatMap((v) =>
    v.rows
      .filter((r) => T1.includes(r.key))
      .map((r) => {
        const i = v.periods.findIndex((x) => x.end === END);
        const c = i < 0 ? null : r.cells[i]!;
        return {
          mode: v.mode,
          metric: r.key,
          period_present: i >= 0,
          state: c ? c.state : "no_column",
          value: c && c.state === "value" ? c.cell.value : null,
          reason: c && c.state === "withheld" ? c.reason : null,
        };
      }),
  );
  out["counts"] = p.counts;
  out["evidence_field_present"] = "evidence" in p;
}
writeFileSync(outPath!, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out).slice(0, 600));
