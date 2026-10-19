import { expect, test, mock } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import type { EnginePage } from "../src/lib/engine/company-preview";
import { bindEvidenceOverlay, type EvidenceOverlay } from "../src/lib/engine/evidence-overlay";

/**
 * W0 (QA خاص): ربط أدلة أربع قيم FY2025 بالحمولة المجمدة بالهوية المالية الكاملة وفشل مغلق،
 * وأدلة المراجع لا تصل إلا عبر مسار خادم منفصل بعد المصادقة والتفويض؛ الحمولة العامة خالية منها.
 */
const fixture = (s: string) =>
  JSON.parse(
    gunzipSync(
      readFileSync(new URL(`./fixtures/codex-20261013/${s}-page.json.gz`, import.meta.url)),
    ).toString(),
  );
const fixturePages = Object.fromEntries(["2222", "1120", "8010"].map((s) => [s, fixture(s)]));
mock.module("virtual:marefa-design-fixtures", () => ({ default: fixturePages }));
const { frozenDesignPreview } = await import("../src/lib/web-v1/design-fixtures.server");
const { buildOverview } = await import("../src/lib/web-v1/company-experience");
const { qaEvidenceAccess, qaEvidenceHttp } = await import("../src/lib/engine/qa-evidence.server");

const OVERLAY_PATH = fileURLToPath(
  new URL("../review-delivery/ARAMCO95/W0/evidence-overlay.json", import.meta.url),
);
const overlay = JSON.parse(readFileSync(OVERLAY_PATH, "utf8")) as EvidenceOverlay;
const page = () => structuredClone(fixturePages["2222"]) as EnginePage;
const RECORDS = ["FQ01-OBS-011", "FQ01-OBS-014", "FQ01-OBS-016", "FQ01-OBS-060"];
const SHA = "78bb678e8e45f5c58fa1b2402ab5a29c5ad10adfda8ba5e7ee5f4d1ad76cd227";
/** علامات لا يجوز أن تظهر في أي حمولة عامة. */
const MARKERS = [...RECORDS, SHA.slice(0, 12), "QA_PRIVATE", "reviewer_only", "data-qa-evidence"];
const ok = (r: ReturnType<typeof frozenDesignPreview>) => {
  if (r.state !== "ok") throw new Error(r.state);
  return r.preview;
};
type Key = EvidenceOverlay["entries"][number]["key"];
type Rows = { metrics: Record<string, Record<string, unknown>[]> };
type Fin = Record<string, Rows> & { history: { annual: { periods: Rows[] } } };
const fin = (p: EnginePage) => p.sections.financials as unknown as Fin;
const withKey = (patch: Partial<Key>) => {
  const o = structuredClone(overlay);
  Object.assign(o.entries[0]!.key, patch);
  return bindEvidenceOverlay(page(), o);
};
const rejectedFirst = (a: ReturnType<typeof bindEvidenceOverlay>) => {
  expect(a.bound.map((b) => b.evidence.record)).toEqual(RECORDS.slice(1));
  expect(a.rejected.map((r) => r.record)).toEqual(["FQ01-OBS-011"]);
  return a.rejected[0]!.reason;
};

/** بيئة QA مكتملة: كل شروط المسار متوفرة، ويبقى الحسم للمصادقة والتفويض. */
const QA_ENV = {
  MAREFA_DESIGN_FIXTURES: "true",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "claude/web-07-company-experience",
  WEB_V1_PREVIEW_ENABLED: "true",
  ENGINE_PREVIEW_ENABLED: "true",
  MAREFA_QA_REVIEWER_ACCESS: "true",
  MAREFA_QA_EVIDENCE_OVERLAY_PATH: OVERLAY_PATH,
  MAREFA_QA_REVIEWER_USER_IDS: "reviewer-1",
};
const TOKEN = "Bearer aaa.bbb.ccc";
const users: Record<string, { userId: string; isAdmin: boolean }> = {
  "aaa.bbb.ccc": { userId: "reviewer-1", isAdmin: true },
  "nonadmin.bbb.ccc": { userId: "reviewer-1", isAdmin: false },
  "admin.other.ccc": { userId: "someone-else", isAdmin: true },
};
const verify = async (t: string) => users[t] ?? null;
const access = (authorization: string | null, env: Record<string, string> = QA_ENV) => {
  const reads: string[] = [];
  const res = qaEvidenceAccess({ authorization, symbol: "2222" }, env, {
    verify,
    page: (s) => fixturePages[s] as EnginePage | undefined,
    readOverlay: (p) => (reads.push(p), readFileSync(p, "utf8")),
  });
  return res.then((r) => ({ ...r, reads }));
};

test("the four FY2025 values bind with the full financial identity; all WITHHELD and reviewer-only", () => {
  const a = bindEvidenceOverlay(page(), overlay);
  expect(a.rejected).toEqual([]);
  expect(a.bound.map((b) => b.evidence.record)).toEqual(RECORDS);
  for (const b of a.bound) {
    expect(b.qualification).toBe("WITHHELD");
    expect(b.display).toBe("reviewer_only");
    expect(b.evidence.sha256).toBe(SHA);
    expect(b.key.currency).toBe("SAR");
    expect(b.key.scope).toBe("consolidated");
  }
});

test("fail-closed: any differing identity field rejects that entry, with no fallback to another row", () => {
  const fields: [keyof Key, unknown][] = [
    ["amount", "1559342000001"],
    ["version", 1],
    ["sourceKey", "file:2db3fec862b11532059c5cf5a122822867153026961f9c0fa13904fc84aee005"],
    ["sourceContentHash", "2db3fec862b11532059c5cf5a122822867153026961f9c0fa13904fc84aee005"],
    ["sourceUrl", "https://www.aramco.com/other.pdf"],
    ["filingType", "Annual report"],
    ["filedAt", "2026-03-11"],
    ["periodEnd", "2024-12-31"],
    ["periodKind", "quarter"],
    ["fiscalYear", 2024],
    ["fiscalQuarter", 4],
    ["metric", "revenue_and_other_income_related_to_sales"],
    ["companyId", "sa:2223"],
  ];
  for (const [field, value] of fields) rejectedFirst(withKey({ [field]: value }));
});

test("negative: SAR → USD is rejected, also when the amount is converted; no currency conversion", () => {
  expect(rejectedFirst(withKey({ currency: "USD" }))).toBe("key_mismatch:currency");
  const usd = String(Math.round(1559342000000 / 3.75));
  expect(rejectedFirst(withKey({ currency: "USD", amount: usd }))).toBe(
    "key_mismatch:currency,amount",
  );
  // والعكس: صف الحمولة نفسه بالدولار لا يُربط بمفتاح بالريال.
  const p = page();
  for (const r of fin(p)["annual"]!.metrics["revenue"]!) r["currency"] = "USD";
  for (const per of fin(p).history.annual.periods)
    for (const r of per.metrics["revenue"] ?? []) r["currency"] = "USD";
  const a = bindEvidenceOverlay(p, overlay);
  expect(a.rejected).toEqual([
    expect.objectContaining({ record: "FQ01-OBS-011", reason: "key_mismatch:currency" }),
  ]);
});

test("negative: a unit or scale change is rejected, even with a rescaled amount", () => {
  expect(rejectedFirst(withKey({ unit: "SAR thousands" }))).toBe("key_mismatch:unit");
  expect(rejectedFirst(withKey({ scale: "1000", amount: "1559342000" }))).toBe(
    "key_mismatch:scale,amount",
  );
  expect(rejectedFirst(withKey({ scale: "1" }))).toBe("key_mismatch:scale");
});

test("negative: a different period start is rejected (FY vs nine months, instant vs flow)", () => {
  expect(rejectedFirst(withKey({ periodStart: "2025-04-01" }))).toBe("key_mismatch:periodStart");
  expect(rejectedFirst(withKey({ periodStart: null }))).toBe("key_mismatch:periodStart");
  const o = structuredClone(overlay);
  o.entries[3]!.key.periodStart = "2025-01-01"; // total_equity is an instant: no start
  const a = bindEvidenceOverlay(page(), o);
  expect(a.rejected).toEqual([
    expect.objectContaining({ record: "FQ01-OBS-060", reason: "key_mismatch:periodStart" }),
  ]);
});

test("negative: consolidation scope or dimensions differences are rejected", () => {
  expect(rejectedFirst(withKey({ scope: "parent" }))).toBe("key_mismatch:scope");
  expect(rejectedFirst(withKey({ dimensions: { segment: "upstream" } }))).toBe(
    "key_mismatch:dimensions",
  );
  // صف حمولة بنطاق مختلف للهوية نفسها: تعارض، لا اختيار.
  const p = page();
  const rev = fin(p)["annual"]!.metrics["revenue"]!;
  rev.push({ ...structuredClone(rev[0]!), scope: "parent" });
  expect(bindEvidenceOverlay(p, overlay).rejected).toEqual([
    expect.objectContaining({ record: "FQ01-OBS-011", reason: "payload_rows_disagree" }),
  ]);
});

test("negative: an incomplete key (old schema 1 shape) or an old schema is rejected", () => {
  const o = structuredClone(overlay);
  delete (o.entries[0]!.key as Partial<Key>).currency;
  const a = bindEvidenceOverlay(page(), o);
  expect(a.rejected).toEqual([
    expect.objectContaining({ record: "FQ01-OBS-011", reason: "key_incomplete" }),
  ]);
  const v1 = { ...structuredClone(overlay), schema: "marefa-qa-evidence-overlay/1" };
  const b = bindEvidenceOverlay(page(), v1 as unknown as EvidenceOverlay);
  expect(b.bound).toEqual([]);
});

test("fail-closed: a different fixture identity rejects every entry", () => {
  const o = structuredClone(overlay);
  o.fixture.generatedAt = "2026-10-14T00:00:00+00:00";
  const a = bindEvidenceOverlay(page(), o);
  expect(a.bound).toEqual([]);
  expect(new Set(a.rejected.map((r) => r.reason))).toEqual(new Set(["fixture_identity_mismatch"]));
});

test("fail-closed: conflicting payload rows for the same identity reject the binding", () => {
  const p = page();
  const snap = (
    p.sections.financials as unknown as Record<string, { metrics: Record<string, unknown[]> }>
  )["annual"]!;
  const row = structuredClone(snap.metrics["revenue"]![0]) as Record<string, unknown>;
  row["value"] = "1559343000000";
  snap.metrics["revenue"]!.push(row);
  const a = bindEvidenceOverlay(p, overlay);
  expect(a.rejected).toEqual([
    expect.objectContaining({ record: "FQ01-OBS-011", reason: "payload_rows_disagree" }),
  ]);
});

test("public payload: no evidence on the preview even with every QA variable set; panel removed (SSR checked over HTTP)", () => {
  const before = ok(frozenDesignPreview({ market: "SA", symbol: "2222" }));
  const prev = { ...process.env };
  Object.assign(process.env, QA_ENV);
  try {
    const p = ok(frozenDesignPreview({ market: "SA", symbol: "2222" }));
    expect("evidence" in p).toBe(false);
    expect(p).toEqual(before);
    const json = JSON.stringify(p);
    for (const m of MARKERS) expect(json.includes(m)).toBe(false);
  } finally {
    process.env = prev;
  }
});

test("the public paths never read an overlay; reviewer evidence lives only in the server route", () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
  for (const f of [
    "../src/lib/engine/company-preview.server.ts",
    "../src/lib/engine/company-preview.ts",
    "../src/lib/web-v1/design-fixtures.server.ts",
    "../src/components/web-v1/company-template.tsx",
    "../src/routes/preview.web-v1.companies.$symbol.tsx",
    "../src/routes/preview.web-v1.companies.$symbol_.overview.tsx",
    "../src/routes/preview.web-v1.companies.$symbol_.intelligence.tsx",
  ]) {
    const s = read(f);
    expect([f, /evidence|OVERLAY|QA_REVIEWER/i.test(s)]).toEqual([f, false]);
  }
  const route = read("../src/routes/preview.qa.evidence.$symbol.ts");
  expect(route).toContain("qaEvidenceHttp");
});

test("access: 404 unless every QA condition holds; the overlay is not read", async () => {
  const drops = [
    "MAREFA_QA_REVIEWER_ACCESS",
    "MAREFA_QA_EVIDENCE_OVERLAY_PATH",
    "MAREFA_QA_REVIEWER_USER_IDS",
    "MAREFA_DESIGN_FIXTURES",
    "VERCEL_ENV",
  ] as const;
  for (const d of drops) {
    const env: Record<string, string> = { ...QA_ENV };
    delete env[d];
    const r = await access(TOKEN, env);
    expect([d, r.status, r.reads.length]).toEqual([d, 404, 0]);
  }
  const prod = await access(TOKEN, { ...QA_ENV, VERCEL_ENV: "production" });
  expect([prod.status, prod.reads.length]).toEqual([404, 0]);
});

test("access: unauthenticated or invalid sessions get 401 before the overlay is read", async () => {
  for (const h of [null, "", "Basic abc", "Bearer ", "Bearer not-a-jwt", "Bearer x.y.z"]) {
    const r = await access(h);
    expect([h, r.status, r.reads.length, r.body]).toEqual([
      h,
      401,
      0,
      { error: "unauthenticated" },
    ]);
  }
  const throwing = await qaEvidenceAccess({ authorization: TOKEN, symbol: "2222" }, QA_ENV, {
    verify: async () => {
      throw new Error("auth service down");
    },
    page: () => page(),
    readOverlay: () => {
      throw new Error("must not read");
    },
  });
  expect(throwing.status).toBe(401);
});

test("access: an authenticated non-reviewer gets 403; an authorised reviewer gets 200 without amounts", async () => {
  for (const h of ["Bearer nonadmin.bbb.ccc", "Bearer admin.other.ccc"]) {
    const r = await access(h);
    expect([h, r.status, r.reads.length, r.body]).toEqual([h, 403, 0, { error: "forbidden" }]);
  }
  const r = await access(TOKEN);
  expect(r.status).toBe(200);
  expect(r.reads).toEqual([OVERLAY_PATH]);
  if (r.status !== 200) return;
  expect(r.body.bound.map((b) => b.record)).toEqual(RECORDS);
  expect(r.body.bound.every((b) => b.qualification === "WITHHELD")).toBe(true);
  const json = JSON.stringify(r.body);
  for (const e of overlay.entries) {
    const v = e.key.amount;
    for (const s of [v, String(Number(v) / 1e6), (Number(v) / 1e6).toLocaleString("en-US")])
      expect(json.includes(s)).toBe(false);
  }
});

test("HTTP: the route responds 401/403/404 with no evidence, no caching, and 200 only for a reviewer", async () => {
  const req = (h?: string) =>
    new Request("http://local/preview/qa/evidence/2222", {
      headers: h ? { authorization: h } : {},
    });
  const cases: [Request, Record<string, string>, number][] = [
    [req(), QA_ENV, 401],
    [req("Bearer nonadmin.bbb.ccc"), QA_ENV, 403],
    [req(TOKEN), { ...QA_ENV, MAREFA_QA_REVIEWER_ACCESS: "false" }, 404],
    [req(TOKEN), QA_ENV, 200],
  ];
  for (const [r, env, status] of cases) {
    const res = await qaEvidenceHttp(r, "2222", env, verify);
    expect(res.status).toBe(status);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.text();
    if (status !== 200) for (const m of MARKERS) expect(body.includes(m)).toBe(false);
    else expect(body).toContain("FQ01-OBS-011");
  }
});

test("one record for the three pages: bound keys are the cells Overview, Investor and Data show", () => {
  const p = ok(frozenDesignPreview({ market: "SA", symbol: "2222" }));
  const a = bindEvidenceOverlay(page(), overlay);
  const annual = p.statements.find((v) => v.mode === "annual")!;
  expect(annual.periods[0]!.end).toBe("2025-12-31");
  const overview = buildOverview(p);
  for (const b of a.bound) {
    const row = annual.rows.find((r) => r.key === b.key.metric)!;
    const cell = row.cells[0]!;
    // Investor topic 5 and the Data tab both render FinancialExplorer from p.statements: this is that cell.
    expect(cell.state).toBe("value");
    if (cell.state !== "value") continue;
    expect(cell.cell.value).toBe(Number(b.key.amount));
    const kf = overview.keyFigures.find((k) => k.key === b.key.metric);
    if (kf && kf.state === "value") expect(kf.cell).toBe(cell.cell); // same object, not a copy
  }
  const kfKeys = overview.keyFigures.filter((k) => k.state === "value").map((k) => k.key);
  expect(kfKeys).toEqual(expect.arrayContaining(["revenue", "net_income", "total_equity"]));
});

test("the overlay file is not part of the product source tree", () => {
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((f) =>
      statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)],
    );
  const src = fileURLToPath(new URL("../src", import.meta.url));
  expect(walk(src).filter((f) => f.endsWith("evidence-overlay.json"))).toEqual([]);
  expect(walk(src).some((f) => readFileSync(f, "utf8").includes("ARAMCO95/W0"))).toBe(false);
});
