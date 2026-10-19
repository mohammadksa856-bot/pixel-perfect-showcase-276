// E2E helper: signs SOURCE_ACCEPT, FINANCIAL_ACCEPT and PUBLICATION_AUTHORIZED for chosen engine rows with an
// ephemeral Ed25519 key that is NOT in the committed trust store. The site must still withhold every one of them.
// Usage: bun review-delivery/ARAMCO95/PROJECTION/sign_untrusted.ts <page.json> <out.json> <section:metric:value>...
import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import {
  APPROVALS_SCHEMA,
  approvalPayload,
  strictIdentity,
  strictKey,
  type Approval,
} from "../../../src/lib/engine/publication-gate.server";

const [pagePath, outPath, ...wanted] = process.argv.slice(2);
const page = JSON.parse(readFileSync(pagePath!, "utf8"));
const history = page.sections.financials.history;
const { privateKey } = generateKeyPairSync("ed25519");
const approvals: Approval[] = [];
for (const w of wanted) {
  const [section, metric, value] = w.split(":");
  const r = history[section!].periods
    .flatMap((p: { metrics: Record<string, unknown[]> }) => p.metrics[metric!] ?? [])
    .find((x: { value: string }) => x.value === value);
  const id = strictIdentity(page.company.company_id, metric!, r);
  if (typeof id === "string") throw new Error(`${w}: ${id}`);
  for (const decision of ["SOURCE_ACCEPT", "FINANCIAL_ACCEPT", "PUBLICATION_AUTHORIZED"] as const) {
    const a = {
      decision,
      decision_ref: `E2E-UNTRUSTED-${decision}`,
      authority_id: "e2e-untrusted-authority",
      subject: { kind: "fact" as const, key: strictKey(id) },
      issued_at: "2026-10-01T00:00:00Z",
      expires_at: "2027-01-01T00:00:00Z",
    };
    approvals.push({
      ...a,
      signature: sign(null, Buffer.from(approvalPayload(a)), privateKey).toString("base64"),
    });
  }
}
writeFileSync(outPath!, JSON.stringify({ schema: APPROVALS_SCHEMA, approvals }));
console.log(approvals.length);
