/**
 * WEB-08B06 / B06-0 — حتمية حزمة القرار: R01 وR03 وR04 (مغلقة) وعدم التراجع عنها، وفحص البيانات الشخصية.
 * R02 في comparability.test.ts، وR05 في tracking.test.ts. لا شبكة، ولا بيانات حقيقية.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- the checks walk untyped JSON documents */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL("../", import.meta.url));
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const CLOSED_AT = "50502951288ac32de6285e4bed0185f4460c548c"; // implementation reviewed when R01, R03, R04 closed
const read = (f: string) => JSON.parse(readFileSync(join(DIR, f), "utf8"));
const rights = read("SOURCE-RIGHTS-MATRIX.json");
const peers = read("PEER-CANDIDATES.json");
const decisions = read("DECISION-REGISTER.json");
const report = readFileSync(join(DIR, "WEB-08B06-INDUSTRY-PEERS-RIGHTS-DECISION_AR.md"), "utf8");
const git = (...args: string[]) => {
  const r = Bun.spawnSync(["git", ...args], { cwd: ROOT });
  if (r.exitCode !== 0) throw Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  return r.stdout;
};

describe("R01 source rights", () => {
  const S = rights.sources as any[];
  test("every product and use has a separate status; no excerpt is a legal status or grant", () => {
    expect(S.length).toBeGreaterThanOrEqual(25);
    for (const s of S) {
      expect(Object.keys(s.uses).sort()).toEqual([...rights.uses].sort());
      expect(s.terms.official_text_verified).toBe(false);
      expect(s.terms.verified_at).toBeNull();
      expect(s.b01_grant).toMatchObject({
        status: "unknown",
        uses_granted: [],
        rights_reviewer: null,
      });
      expect(s.content_types.length).toBeGreaterThan(0);
      expect(typeof s.dataset_version).toBe("string");
      for (const u of Object.values<any>(s.uses))
        expect(["PENDING_VERIFICATION", "UNKNOWN"]).toContain(u.proposed_legal_status);
      if (s.terms.excerpt_summary === null)
        for (const u of Object.values<any>(s.uses)) expect(u.proposed_legal_status).toBe("UNKNOWN");
    }
  });
  test("licences are per product, never inherited", () => {
    const keys = S.map((s) => `${s.provider}|${s.product}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of S) {
      expect(JSON.stringify(s)).not.toMatch(/inherit(s|ed)_from|applies_to_all_products/);
      expect(s.licence_scope).toMatch(/this product only/);
    }
    const iea = S.filter((s) => s.provider === "IEA");
    const ids = iea.map((s) => s.id).sort();
    expect(ids).toEqual([
      "SRC-IEA-ESDB",
      "SRC-IEA-PAID",
      "SRC-IEA-REPORTS",
      "SRC-IEA-WEO2025-FREE",
    ]);
    const byId = Object.fromEntries(iea.map((s) => [s.id, s]));
    expect(byId["SRC-IEA-WEO2025-FREE"].terms.excerpt_summary).toMatch(/CC BY-NC-SA 4\.0/);
    expect(byId["SRC-IEA-REPORTS"].terms.excerpt_summary).toMatch(/datasets.*excluded/);
    expect(byId["SRC-IEA-PAID"].uses.redistribution.excerpt_reading).toBe(
      "APPEARS_PROHIBITED_WITHOUT_CONSENT",
    );
    // Data Browser: Codex-reported CC BY 4.0 is recorded, not adopted
    expect(byId["SRC-IEA-ESDB"].codex_reported).toMatch(/CC BY 4\.0/);
    for (const u of Object.values<any>(byId["SRC-IEA-ESDB"].uses))
      expect(u.proposed_legal_status).toBe("UNKNOWN");
  });
  test("financial facts and protected content are separate products", () => {
    const ids = new Set(S.map((s) => s.id));
    for (const id of [
      "SRC-SEC-XBRL-FACTS",
      "SRC-SEC-FILING-DOCS",
      "SRC-ARAMCO-FIN",
      "SRC-ARAMCO-NARR",
      "SRC-EIA-OPENDATA",
      "SRC-EIA-SPOT",
    ])
      expect(ids.has(id)).toBe(true);
    const spot = S.find((s) => s.id === "SRC-EIA-SPOT");
    expect(spot.third_party_components.join(" ")).toMatch(/Refinitiv/);
    const aramco = S.find((s) => s.id === "SRC-ARAMCO-FIN");
    expect(aramco.notes).toMatch(/not an established violation/);
  });
});

describe("R03 peer eligibility", () => {
  test("candidates only; no approved peer list", () => {
    expect(peers.status).toBe("CANDIDATES_ONLY_NO_APPROVED_PEER_LIST");
    for (const p of peers.candidates) {
      expect(p.approved).toBe(false);
      expect(p.status).toBe("CANDIDATE_PENDING_OWNER_DECISION");
      expect(p.data_availability.company_facts_completeness).toBe("UNVERIFIED");
    }
    expect(JSON.stringify(peers)).not.toMatch(/"approved":\s*true|"APPROVED_PEERS?"/);
  });
  test("ownership, control, consolidation and commercial relationship are separate", () => {
    expect(Object.keys(peers.dimension_rules).sort()).toEqual([
      "commercial_relationship",
      "consolidation",
      "control",
      "ownership",
    ]);
    expect(peers.aramco_relationship_rules.CONSOLIDATED_SUBSIDIARY).toMatch(
      /segment-specific analysis/,
    );
    expect(peers.aramco_relationship_rules.EQUITY_ACCOUNTED).toMatch(/Not automatically excluded/);
    for (const p of peers.candidates) {
      expect(p.ownership).toBeDefined();
      expect(p.control).toBeDefined();
      expect(p.relationship_to_aramco).toBeDefined();
    }
  });
  test("Equinor 78% is the NCS petroleum marginal rate, not a group rate", () => {
    const eq = peers.candidates.find((p: any) => p.id === "EQNR");
    expect(eq.fiscal_regime_note).toMatch(/Norwegian continental shelf/);
    expect(eq.fiscal_regime_note).toMatch(/not the group's effective tax rate/);
  });
});

describe("R04 execution gate", () => {
  test("no implicit authorisation to start B06-1", () => {
    expect(decisions.execution_gate).toEqual([
      "Codex independent review of B06-0",
      "Codex ACCEPT of the B06-0 decision pack",
      "owner decisions required for the batch",
      "explicit implementation assignment for the batch",
      "start of that batch",
    ]);
    for (const d of decisions.decisions) {
      expect(d.implementation_authorization).toBe(false);
      expect(d.owner_approval).toBe("PENDING");
    }
    expect(report).not.toMatch(/يمكن البدء به فورًا|فور مراجعة Codex/);
    expect(report).toMatch(/ACCEPT لحزمة B06-0 لا يعني تصريحًا ببدء B06-1/);
  });
  test("decision register separates facts, recommendation and approvals", () => {
    expect(decisions.decisions.map((d: any) => d.id)).toEqual([
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
      "D7",
      "D8",
      "D9",
    ]);
    for (const d of decisions.decisions)
      for (const k of [
        "verified_facts",
        "unverified_facts",
        "recommendation",
        "owner_approval",
        "legal_approval",
        "implementation_authorization",
      ])
        expect(d).toHaveProperty(k);
    const now = decisions.decisions
      .filter((d: any) => d.presentable_to_owner_now)
      .map((d: any) => d.id);
    expect(now).toEqual(["D3", "D4", "D8", "D9"]);
    expect(decisions.decisions.find((d: any) => d.id === "D4").recommendation).toMatch(
      /not an established violation/,
    );
  });
});

describe("no regression in closed R01, R03, R04", () => {
  test("their files are byte-identical to the reviewed implementation", () => {
    for (const f of [
      "SOURCE-RIGHTS-MATRIX.json",
      "PEER-CANDIDATES.json",
      "DECISION-REGISTER.json",
      "WEB-08B06-INDUSTRY-PEERS-RIGHTS-DECISION_AR.md",
    ]) {
      const before = git("show", `${CLOSED_AT}:review-delivery/WEB08B06/${f}`);
      expect({ f, same: readFileSync(join(DIR, f)).equals(Buffer.from(before)) }).toEqual({
        f,
        same: true,
      });
    }
  });
});

describe("no unneeded change to closed or non-executable delivery files", () => {
  const PREVIOUS_DELIVERY = "cc5c92c8e3197c01880041c024c7584844d7d664";
  test("earlier closure reports, logs, R05-A outputs and unrelated tools are byte-identical to the previous delivery", () => {
    const listed = git(
      "ls-tree",
      "-r",
      "--name-only",
      PREVIOUS_DELIVERY,
      "review-delivery/WEB08B06/test-logs",
    )
      .toString()
      .trim()
      .split("\n");
    const files = [
      ...listed.map((f) => f.replace("review-delivery/WEB08B06/", "")),
      "B06-0-R01-R05-CLOSURE_AR.md",
      "B06-0-R02A-R02B-R05A-CLOSURE_AR.md",
      "TRACKING-EVENT-CORRECTIONS.json",
      "tools/tracking_audit.py",
      "tools/registers.py",
      "tools/matrix.py",
    ];
    expect(files.length).toBeGreaterThan(15);
    for (const f of files) {
      const before = git("show", `${PREVIOUS_DELIVERY}:review-delivery/WEB08B06/${f}`);
      expect({ f, same: readFileSync(join(DIR, f)).equals(Buffer.from(before)) }).toEqual({
        f,
        same: true,
      });
    }
  });
});

describe("no personal data or secrets in the package", () => {
  const files = (d: string): string[] =>
    readdirSync(d).flatMap((f) =>
      statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)],
    );
  test("no personal email, token, key or local user path", () => {
    const public_role_addresses = new Set([
      "compliance@iea.org",
      "statisticalreview@energyinst.org",
    ]);
    const all = files(DIR);
    expect(all.length).toBeGreaterThanOrEqual(7);
    for (const f of all) {
      const t = readFileSync(f, "utf8");
      for (const m of t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [])
        expect({ f, m, allowed: public_role_addresses.has(m) }).toEqual({ f, m, allowed: true });
      expect({
        f,
        hit: /ghp_[A-Za-z0-9]{20}|github_pat_[A-Za-z0-9_]{20}|sk-[A-Za-z0-9]{20}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY/.test(
          t,
        ),
      }).toEqual({ f, hit: false });
      expect({ f, hit: /\/home\/[a-z]|C:[\\/]Users[\\/]/.test(t) }).toEqual({ f, hit: false });
    }
  });
});
