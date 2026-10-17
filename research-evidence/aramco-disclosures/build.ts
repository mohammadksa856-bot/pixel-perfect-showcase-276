/**
 * WEB-08B03 — يكتب مخرجات التسليم من اللقطة المجمدة وسجل B02 (حتمي: لا طوابع زمنية للتشغيل).
 *   bun research-evidence/aramco-disclosures/build.ts            → يكتب review-delivery/WEB08B03/*.json
 *   bun research-evidence/aramco-disclosures/build.ts --check    → يفشل إن اختلف المكتوب عن البناء
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { bridgeAll } from "./contract-bridge";
import { buildRegister, loadB02, loadSnapshot, type Register } from "./register";

const OUT = new URL("../../review-delivery/WEB08B03/", import.meta.url);

export function deliverables(r: Register): Record<string, unknown> {
  const notice = {
    status: "UNQUALIFIED_SAMPLE — WITHHELD",
    publication: "not_for_public_display",
    note: "Read-only register over the accepted frozen snapshot. No values stored, no approvals, no forecasts.",
  };
  return {
    "DISCLOSURE-EVENT-REGISTER.json": {
      ...notice,
      schema: r.schema,
      company: r.company,
      snapshot: r.snapshot,
      documents: r.documents,
      events: r.events,
      unclassified: r.unclassified,
    },
    "CLAIMS-REGISTER.json": { ...notice, company: r.company, claims: r.claims },
    "TOPIC-MAP.json": { ...notice, company: r.company, topics: r.topicMap },
    "PROJECTS.json": { ...notice, company: r.company, projects: r.projects },
    "RISK-GUIDANCE-REGISTER.json": {
      ...notice,
      company: r.company,
      categories: r.riskGuidance.categories,
      notes: r.riskGuidance.notes,
      entries: r.claims
        .filter((c) => Object.values(r.riskGuidance.categories).some((ids) => ids.includes(c.id)))
        .map((c) => ({
          id: c.id,
          category: c.category,
          planKind: c.planKind,
          topic: c.topic,
          quote: c.quote,
          effect: c.effect,
          qualification: c.qualification,
        })),
    },
    "CONTRACT-BRIDGE.json": {
      ...notice,
      contract: "research-claim/1 (WEB-08B01 cef8ce9)",
      results: bridgeAll(r),
    },
  };
}

const text = (v: unknown) => JSON.stringify(v, null, 1) + "\n";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = deliverables(buildRegister(loadSnapshot(), loadB02()));
  const check = process.argv.includes("--check");
  mkdirSync(OUT, { recursive: true });
  let diff = 0;
  for (const [name, v] of Object.entries(files)) {
    const url = new URL(name, OUT);
    if (check) {
      let cur = "";
      try {
        cur = readFileSync(url, "utf8");
      } catch {
        cur = "";
      }
      if (cur !== text(v)) {
        diff++;
        console.log(`DIFF ${name}`);
      } else console.log(`same ${name}`);
    } else {
      writeFileSync(url, text(v));
      console.log(`wrote ${name}`);
    }
  }
  if (check && diff) process.exitCode = 1;
}
