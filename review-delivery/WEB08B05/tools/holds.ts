import { readFileSync } from "node:fs";
import { compilePack } from "../../../research-evidence/aramco-research-pack/pack";
import { loadContext } from "../../../research-evidence/aramco-research-pack/evidence";
const ctx = loadContext();
const p = compilePack(ctx);
const w = JSON.parse(readFileSync(new URL("../../../review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json", import.meta.url), "utf8"));
console.log(JSON.stringify({
  paragraphs: p.paragraphs.length,
  analyses_blocked: `${p.analyses.filter((a) => a.status === "BLOCKED").length}/${p.analyses.length}`,
  b03_claims_withheld: `${ctx.register.claims.filter((c) => c.qualification.status === "WITHHELD").length}/${ctx.register.claims.length}`,
  b02_inputs_withheld: w.results.length,
  b02_qualified_for_research: w.qualified_for_research,
  b02_approved_for_display: w.approved_for_display,
  approved_paragraph_statuses: p.paragraphs.filter((x) => !/^(WITHHELD|UNAPPROVED_|METHODOLOGY_PENDING|OPEN_GAP)/.test(x.status)).length,
}));
