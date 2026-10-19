import { expect, test, mock, describe } from "bun:test";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EnginePage } from "../src/lib/engine/company-preview";
import {
  applyPeerGate,
  applyPublicationGate,
  approvalPayload,
  committedTrustStore,
  frozenRowKey,
  strictIdentity,
  strictKey,
  type Approval,
  type Decision,
  type TrustStore,
} from "../src/lib/engine/publication-gate.server";

/**
 * ARAMCO95 PROJECTION — التصحيح الموجّه (الموانع السبعة لمراجعة Codex). قيم اصطناعية فقط (علامات 7770xx).
 * الحمولات اصطناعية بالكامل (tests/fixtures/synthetic-projection، مُصدرون وهميون 9901 و9902 و9903، علامات 4242…).
 * M1 الهوية · M2 خط الأساس · M3 سلطة الاعتماد · M4 النظراء · M5 المدخلات المشوّهة · M6 Q4 · M7 التواريخ.
 */
const SYMBOLS = ["9901", "9902", "9903"];
const fixture = (s: string) =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/synthetic-projection/${s}-page.json`, import.meta.url),
      "utf8",
    ),
  );
const pages = Object.fromEntries(SYMBOLS.map((s) => [s, fixture(s)]));
mock.module("virtual:marefa-design-fixtures", () => ({ default: pages }));
const { buildCompanyPreview } = await import("../src/lib/engine/company-preview");
const { fetchCompanyPreview } = await import("../src/lib/engine/company-preview.server");
const { fetchPeerTable } = await import("../src/lib/engine/peer-comparison.server");
const { frozenDesignPreview } = await import("../src/lib/web-v1/design-fixtures.server");
const { buildOverview, intelGroups } = await import("../src/lib/web-v1/company-experience");
const { fiscalYearEndMonth, fiscalDateKind } = await import("../src/lib/engine/statements");

type Row = Record<string, unknown>;
type Period = { period_end: string; metrics: Record<string, Row[]> };
type Hist = { status?: string; reason?: string | null; period_kind?: string; periods: Period[] };
type Fin = Record<string, { metrics?: Record<string, Row[]> }> & {
  history: Record<string, Hist> & { quarter: Hist; annual_position: Hist; quarter_position?: Hist };
};
const NOW = new Date("2026-10-19T12:00:00Z");
const fin = (p: EnginePage) => p.sections.financials as unknown as Fin;
const base = () => structuredClone(pages["9901"]) as EnginePage;
const has = (x: unknown, v: string) => JSON.stringify(x).includes(v);
const MARKS = ["777001000000", "777002000000", "777003000000", "777004000000"];

/** صف اصطناعي بهوية صارمة كاملة. */
function row(over: Row = {}): Row {
  return {
    value: "777001000000",
    value_type: "decimal",
    currency: "SAR",
    unit: "SAR",
    period_start: "2025-07-01",
    period_end: "2025-09-30",
    period_kind: "quarter",
    fiscal_year: 2025,
    fiscal_quarter: 3,
    scope: "consolidated",
    dimensions: {},
    version: 1,
    source_key: "file:synthetic-projection",
    source_url: "https://example.invalid/synthetic.pdf",
    is_calculated: 0,
    quality_score: "1",
    provenance: {
      source: {
        source_key: "file:synthetic-projection",
        source_url: "https://example.invalid/synthetic.pdf",
        content_type: "application/pdf",
      },
      extraction: { page: 1 },
    },
    ...over,
  };
}
const bal = (over: Row = {}) => row({ period_kind: "instant", period_start: null, ...over });

/** حمولة 9901 مع ربع اصطناعي (revenue, net_income) ورصيدين اصطناعيين في quarter_position. */
function withSynthetic() {
  const p = base();
  const rows = {
    revenue: row({ value: MARKS[0] }),
    net_income: row({ value: MARKS[1] }),
    cash: bal({ value: MARKS[2] }),
    total_equity: bal({ value: MARKS[3] }),
  };
  fin(p).history.quarter.periods.push({
    period_end: "2025-09-30",
    metrics: { revenue: [rows.revenue], net_income: [rows.net_income] },
  });
  fin(p).history.quarter_position = {
    status: "available",
    reason: null,
    period_kind: "instant",
    periods: [
      {
        period_end: "2025-09-30",
        metrics: { cash: [rows.cash], total_equity: [rows.total_equity] },
      },
    ],
  };
  return { page: p, rows };
}

// ───────────── test-only signing authority (never in the committed trust store)
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const PUB = publicKey.export({ type: "spki", format: "der" }).toString("base64");
const TEST_TRUST: TrustStore = {
  schema: "marefa-publication-trust/1",
  authorities: [
    {
      authority_id: "test-source-reviewer",
      public_key_spki_der_b64: PUB,
      decisions: ["SOURCE_ACCEPT", "WITHHELD"],
    },
    { authority_id: "test-finance", public_key_spki_der_b64: PUB, decisions: ["FINANCIAL_ACCEPT"] },
    {
      authority_id: "test-rights",
      public_key_spki_der_b64: PUB,
      decisions: ["PUBLICATION_AUTHORIZED"],
    },
  ],
};
const WHO: Record<Decision, string> = {
  SOURCE_ACCEPT: "test-source-reviewer",
  FINANCIAL_ACCEPT: "test-finance",
  PUBLICATION_AUTHORIZED: "test-rights",
  WITHHELD: "test-source-reviewer",
};
function approve(key: string, decision: Decision, over: Partial<Approval> = {}): Approval {
  const a = {
    decision,
    decision_ref: `TEST-${decision}-1`,
    authority_id: WHO[decision],
    subject: { kind: "fact" as const, key },
    issued_at: "2026-10-01T00:00:00Z",
    expires_at: "2027-01-01T00:00:00Z",
    ...over,
  };
  return {
    ...a,
    signature: sign(null, Buffer.from(approvalPayload(a)), privateKey).toString("base64"),
  };
}
const keyOf = (r: Row, metric = "revenue") => {
  const id = strictIdentity("sa:9901", metric, r);
  if (typeof id === "string") throw new Error(id);
  return strictKey(id);
};
const triple = (k: string) =>
  (["SOURCE_ACCEPT", "FINANCIAL_ACCEPT", "PUBLICATION_AUTHORIZED"] as const).map((d) =>
    approve(k, d),
  );
const records = (a: Approval[]) => ({ schema: "marefa-publication-approvals/1", approvals: a });
const live = (p: EnginePage, a: unknown, trust?: TrustStore) =>
  applyPublicationGate(p, a, { mode: "live_engine", now: NOW, ...(trust ? { trust } : {}) });
const frozen = (p: EnginePage, a: unknown) =>
  applyPublicationGate(p, a, { mode: "frozen_design_fixture", now: NOW });

const ENV = (approvalsPath?: string) => ({
  ENGINE_PREVIEW_ENABLED: "true",
  FINENGINE_API_URL: "http://engine.test",
  FINENGINE_API_KEY: "test-key",
  ...(approvalsPath ? { MAREFA_PUBLICATION_APPROVALS_PATH: approvalsPath } : {}),
});
const engineFetch = (body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;
async function serverPreview(page: unknown, approvals?: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "approvals-"));
  try {
    let path: string | undefined;
    if (approvals !== undefined) {
      path = join(dir, "a.json");
      writeFileSync(path, typeof approvals === "string" ? approvals : JSON.stringify(approvals));
    }
    return await fetchCompanyPreview(
      { market: "SA", symbol: "9901" },
      ENV(path),
      engineFetch(page),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const valueCells = (r: Awaited<ReturnType<typeof fetchCompanyPreview>>) =>
  r.state === "ok"
    ? r.preview.statements
        .flatMap((v) => v.rows.flatMap((x) => x.cells))
        .filter((c) => c.state === "value").length
    : 0;

// ═════════════ M1 — الهوية المالية الكاملة، بلا تعويض
describe("M1 identity: no default filling; incomplete or contradictory identities are withheld", () => {
  const required = [
    "scope",
    "dimensions",
    "currency",
    "unit",
    "period_start",
    "period_end",
    "period_kind",
    "version",
    "source_key",
    "value",
  ];
  test("each missing identity field → identity_incomplete (no default)", () => {
    for (const f of required) {
      const r = row();
      delete r[f];
      expect([f, strictIdentity("sa:9901", "revenue", r)]).toEqual([f, "identity_incomplete"]);
    }
    expect(strictIdentity("", "revenue", row())).toBe("identity_incomplete");
    expect(strictIdentity("sa:9901", "revenue", null)).toBe("identity_incomplete");
  });
  test("wrong types → identity_incomplete", () => {
    const bad: Row[] = [
      { scope: "" },
      { scope: 1 },
      { dimensions: null },
      { dimensions: [] },
      { dimensions: { segment: 1 } },
      { currency: null },
      { unit: "" },
      { version: 0 },
      { version: 1.5 },
      { version: "1" },
      { source_key: "" },
      { value: 777 },
      { value: "" },
      { value: "abc" },
      { period_kind: "daily" },
      { period_end: "2025-02-30" },
      { period_end: "2025-13-31" },
      { period_end: "30/09/2025" },
      { period_start: null },
    ];
    for (const b of bad)
      expect([b, strictIdentity("sa:9901", "revenue", row(b))]).toEqual([b, "identity_incomplete"]);
  });
  test("contradictions → identity_contradictory", () => {
    const bad: Row[] = [
      bal({ period_start: "2025-07-01" }), // a balance with a start date
      row({ period_start: "2025-10-01" }), // start after end
      row({ period_start: "2025-02-30" }), // impossible start date
      row({ currency: "USD" }), // SAR unit, USD currency
      row({ currency: "" }), // monetary unit without currency
      row({ unit: "ratio", currency: "SAR" }), // non-monetary unit with a currency
      row({ unit: "SAR/share", currency: "USD" }),
    ];
    for (const b of bad)
      expect(strictIdentity("sa:9901", "revenue", b)).toBe("identity_contradictory");
  });
  test("the legitimate forms are exactly the explicit ones (no exception the contract does not state)", () => {
    expect(typeof strictIdentity("sa:9901", "revenue", row())).toBe("object");
    expect(typeof strictIdentity("sa:9901", "cash", bal())).toBe("object");
    expect(typeof strictIdentity("sa:9901", "cash", bal({ period_start: "" }))).toBe("object"); // engine's empty start for instants
    expect(
      typeof strictIdentity("sa:9901", "net_margin", row({ unit: "ratio", currency: "" })),
    ).toBe("object");
    expect(typeof strictIdentity("sa:9901", "eps", row({ unit: "SAR/share" }))).toBe("object");
    expect(typeof strictIdentity("sa:9901", "revenue", row({ value: null }))).toBe("object");
  });
  test("a valid approval cannot rescue an incomplete row: the key cannot be formed, the row is withheld", () => {
    const { page, rows } = withSynthetic();
    const k = keyOf(rows.revenue);
    delete (fin(page).history.quarter.periods.at(-1)!.metrics.revenue![0] as Row)["scope"];
    const { page: g, summary } = live(page, records(triple(k)), TEST_TRUST);
    expect(has(g, MARKS[0]!)).toBe(false);
    expect(summary.reasons.identity_incomplete).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════ M2 — خط الأساس محصور في الوضع المجمّد
describe("M2 baseline: only the frozen design-fixture mode may use the frozen baseline identities", () => {
  test("frozen mode keeps every fixture row; live mode keeps none of the same rows", () => {
    for (const s of SYMBOLS) {
      const p = structuredClone(pages[s]) as EnginePage;
      const f = frozen(p, null);
      expect(f.page).toEqual(p);
      expect(f.summary.withheld_rows).toBe(0);
      expect(f.summary.baseline_rows).toBeGreaterThan(50); // not vacuous: the fixture rows really pass via the baseline
      const l = live(p, null);
      expect(l.summary.baseline_rows).toBe(0);
      expect(l.summary.approved_rows).toBe(0);
      expect(l.summary.withheld_rows).toBe(f.summary.baseline_rows);
    }
  });
  test("server function, live path: the fixture's own rows (baseline identities) produce no value cell", async () => {
    const r = await serverPreview(base());
    expect(r.state).toBe("ok");
    expect(valueCells(r)).toBe(0);
  });
  test("frozen path: previews unchanged; the frozen gate is a no-op on the pinned fixtures", () => {
    for (const s of SYMBOLS) {
      const r = frozenDesignPreview({ market: "SA", symbol: s });
      expect(r.state).toBe("ok");
      if (r.state !== "ok") continue;
      const cells = r.preview.statements.flatMap((v) => v.rows.flatMap((x) => x.cells));
      expect(cells.filter((c) => c.state === "value").length).toBeGreaterThan(40);
      // calculated rows (ratios) are still withheld on the frozen path
      expect(cells.some((c) => c.state === "withheld" && c.reason === "quality_flagged")).toBe(
        true,
      );
    }
  });
  test("a new row is not in the frozen baseline: withheld even in frozen mode", () => {
    const { page } = withSynthetic();
    const { page: g, summary } = frozen(page, null);
    for (const v of MARKS) expect(has(g, v)).toBe(false);
    expect(summary.reasons.not_in_frozen_baseline).toBe(4);
  });
});

// ═════════════ M3 — سلطة الاعتماد
describe("M3 authority: JSON words are not decisions; only signed decisions from trusted, authorised authorities count", () => {
  test("the committed trust store is empty and the server paths take no trust input", () => {
    expect(committedTrustStore().authorities).toEqual([]);
    for (const f of [
      "../src/lib/engine/company-preview.server.ts",
      "../src/lib/web-v1/design-fixtures.server.ts",
      "../src/lib/engine/peer-comparison.server.ts",
    ]) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      expect([f, /trust\s*:/.test(src), /TRUST/.test(src)]).toEqual([f, false, false]);
    }
    const gate = readFileSync(
      new URL("../src/lib/engine/publication-gate.server.ts", import.meta.url),
      "utf8",
    );
    expect(/env\[[^\]]*TRUST/.test(gate)).toBe(false); // no environment override of the trust store
  });
  test("unsigned old-style ledger entries with all three states → withheld (server function and pure)", async () => {
    const { page, rows } = withSynthetic();
    const legacy = {
      schema: "marefa-publication-approvals/1",
      approvals: [
        {
          decision: "SOURCE_ACCEPT",
          decision_ref: "x",
          authority_id: "test-source-reviewer",
          subject: { kind: "fact", key: keyOf(rows.revenue) },
          issued_at: "2026-10-01T00:00:00Z",
          signature: "",
        },
      ],
    };
    expect(has(live(page, legacy, TEST_TRUST).page, MARKS[0]!)).toBe(false);
    const old = {
      schema: "marefa-publication-ledger/1",
      entries: [
        {
          kind: "fact",
          source_accept: { state: "SOURCE_ACCEPT" },
          financial_accept: { state: "FINANCIAL_ACCEPT" },
          publication: { state: "PUBLICATION_AUTHORIZED" },
        },
      ],
    };
    const r = await serverPreview(page, old);
    expect(MARKS.some((v) => has(r, v))).toBe(false);
  });
  test("bypass: correctly signed decisions from a key that is not committed never reach the server response", async () => {
    const { page, rows } = withSynthetic();
    const all = [...triple(keyOf(rows.revenue)), ...triple(keyOf(rows.cash, "cash"))];
    const r = await serverPreview(page, records(all));
    expect(r.state).toBe("ok");
    if (r.state !== "ok") return;
    const everything = JSON.stringify([r, buildOverview(r.preview), intelGroups(r.preview)]);
    expect(/77700[1-4]/.test(everything)).toBe(false);
    expect(valueCells(r)).toBe(0);
  });
  test("verification logic (pure function with an explicit test trust store): only the full signed triple passes", () => {
    const { page, rows } = withSynthetic();
    const k = keyOf(rows.revenue);
    const ok = live(page, records(triple(k)), TEST_TRUST);
    expect([has(ok.page, MARKS[0]!), ok.summary.approved_rows]).toEqual([true, 1]);
    const [s, f, p] = triple(k);
    const cases: [string, Approval[]][] = [
      ["no source accept", [f!, p!]],
      ["no financial accept", [s!, p!]],
      ["no publication authorisation", [s!, f!]],
      [
        "authority not allowed for that decision",
        [approve(k, "SOURCE_ACCEPT", { authority_id: "test-finance" }), f!, p!],
      ],
      ["unknown authority", [approve(k, "SOURCE_ACCEPT", { authority_id: "nobody" }), f!, p!]],
      [
        "signature over another subject",
        [
          {
            ...approve(keyOf(rows.net_income, "net_income"), "SOURCE_ACCEPT"),
            subject: { kind: "fact", key: k },
          },
          f!,
          p!,
        ],
      ],
      ["tampered decision_ref", [{ ...s!, decision_ref: "TEST-OTHER" }, f!, p!]],
      ["expired", [approve(k, "SOURCE_ACCEPT", { expires_at: "2026-10-19T11:00:00Z" }), f!, p!]],
      [
        "issued in the future",
        [approve(k, "SOURCE_ACCEPT", { issued_at: "2026-11-01T00:00:00Z" }), f!, p!],
      ],
      ["garbage signature", [{ ...s!, signature: "AAAA" }, f!, p!]],
    ];
    for (const [name, a] of cases)
      expect([name, has(live(page, records(a), TEST_TRUST).page, MARKS[0]!)]).toEqual([
        name,
        false,
      ]);
    const revoked: TrustStore = {
      ...TEST_TRUST,
      authorities: TEST_TRUST.authorities.map((x) => ({ ...x, revoked: true })),
    };
    expect(has(live(page, records(triple(k)), revoked).page, MARKS[0]!)).toBe(false);
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 })
      .publicKey.export({ type: "spki", format: "der" })
      .toString("base64");
    const notEd: TrustStore = {
      ...TEST_TRUST,
      authorities: TEST_TRUST.authorities.map((x) => ({ ...x, public_key_spki_der_b64: rsa })),
    };
    expect(has(live(page, records(triple(k)), notEd).page, MARKS[0]!)).toBe(false);
  });
  test("a decision is bound to the full identity: new version, source or value is a new key", () => {
    const { page, rows } = withSynthetic();
    const a = records(triple(keyOf(rows.revenue)));
    for (const c of [
      { version: 2 },
      { source_key: "file:other" },
      { value: "777001000001" },
      { scope: "parent" },
      { dimensions: { segment: "x" } },
    ]) {
      const p = structuredClone(page);
      Object.assign(fin(p).history.quarter.periods.at(-1)!.metrics.revenue![0]!, c);
      expect([c, live(p, a, TEST_TRUST).summary.approved_rows]).toEqual([c, 0]);
    }
  });
  test("WITHHELD wins, in live mode over a full triple and in frozen mode over the baseline", () => {
    const { page, rows } = withSynthetic();
    const k = keyOf(rows.revenue);
    expect(
      has(live(page, records([...triple(k), approve(k, "WITHHELD")]), TEST_TRUST).page, MARKS[0]!),
    ).toBe(false);
    const p = base();
    const r0 = fin(p).history.quarter.periods[0]!.metrics.revenue![0]!;
    const id = strictIdentity("sa:9901", "revenue", r0);
    if (typeof id !== "string") {
      const g = frozen(p, records([approve(strictKey(id), "WITHHELD")]));
      expect(g.summary.reasons.explicit_withheld).toBeGreaterThanOrEqual(1);
    }
  });
});

// ═════════════ M4 — النظراء
describe("M4 peers: /peers carries no source key, version or start date; every value is withheld", () => {
  const resp = {
    status: "available",
    reason: null,
    methodology: "x",
    scope: { field: "industry", value: "Synthetic Industrials" },
    peer_count: 1,
    metric_count: 1,
    companies: [
      {
        market: "SA",
        symbol: "9901",
        name: "A",
        is_target: true,
        metrics: {
          net_margin: {
            value: "0.777101",
            unit: "ratio",
            period_end: "2025-12-31",
            period_kind: "fy",
          },
        },
      },
      {
        market: "SA",
        symbol: "9904",
        name: "B",
        is_target: false,
        metrics: {
          net_margin: {
            value: "0.777102",
            unit: "ratio",
            period_end: "2025-12-31",
            period_kind: "fy",
            source_key: "file:x",
            version: 1,
          },
        },
      },
    ],
  };
  test("pure: all values emptied, whatever fields a row claims", () => {
    const g = applyPeerGate(resp);
    expect([g.withheld, has(g.resp, "0.7771")]).toEqual([2, false]);
  });
  test("server function fetchPeerTable: no peer value reaches the table; malformed responses do not throw", async () => {
    const env = {
      ENGINE_PEERS_ENABLED: "true",
      FINENGINE_API_URL: "http://e",
      FINENGINE_API_KEY: "k",
    };
    const f = (body: unknown) =>
      (async (url: string) =>
        new Response(
          JSON.stringify(
            String(url).includes("/peers") ? body : { industry: "Synthetic Industrials" },
          ),
          { status: 200 },
        )) as unknown as typeof fetch;
    expect(
      has(await fetchPeerTable({ market: "SA", symbol: "9901" }, env, f(resp)), "0.7771"),
    ).toBe(false);
    for (const bad of [
      null,
      7,
      "x",
      [],
      { companies: "x" },
      { companies: [null, 3, { metrics: [] }] },
    ])
      await fetchPeerTable({ market: "SA", symbol: "9901" }, env, f(bad));
  });
});

// ═════════════ M5 — المدخلات المشوّهة
describe("M5 malformed inputs fail closed without throwing or exposing values", () => {
  // Deliberately untyped: these mutations break the contract on purpose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Loose = Record<string, any>;
  const variants = (): unknown[] => {
    const out: unknown[] = [];
    const mk = (fn: (p: Loose) => void) => {
      const { page } = withSynthetic();
      fn(page as unknown as Loose);
      out.push(page);
    };
    mk((p) => {
      p.sections.financials = "x";
    });
    mk((p) => {
      p.sections.financials.history = [];
    });
    mk((p) => {
      p.sections.financials.history.quarter = { periods: "x" };
    });
    mk((p) => {
      p.sections.financials.history.quarter.periods.push(null, 3, { metrics: [] });
    });
    mk((p) => {
      p.sections.financials.history.quarter.periods.at(-1).metrics.revenue = {
        0: p.sections.financials.history.quarter.periods.at(-1).metrics.revenue[0],
      };
    });
    mk((p) => {
      p.sections.financials.history.quarter.periods.at(-1).metrics.revenue.push(null, "x", 5, []);
    });
    mk((p) => {
      p.sections.financials.annual = 7;
    });
    mk((p) => {
      p.company = "x";
    });
    return out;
  };
  test("pure gate: never throws, never keeps a synthetic value", () => {
    for (const v of variants()) {
      const g = live(v as EnginePage, null, TEST_TRUST);
      expect(MARKS.some((m) => has(g.page, m))).toBe(false);
    }
    for (const v of [null, 5, "x", [], {}, { sections: 3 }])
      expect(() => live(v as EnginePage, null)).not.toThrow();
  });
  test("server function: malformed engine payloads return a controlled state, never a value or a thrown error", async () => {
    for (const v of [...variants(), [], 5, "x", { contract_version: 4 }]) {
      const r = await serverPreview(v);
      expect(["ok", "engine_unavailable", "not_found"]).toContain(r.state);
      expect(MARKS.some((m) => has(r, m))).toBe(false);
      if (r.state === "engine_unavailable") expect(r.reason).not.toMatch(/Error|at |\n/);
    }
  });
  test("malformed approval records: invalid state, nothing verifies, no throw", () => {
    const { page } = withSynthetic();
    for (const a of [
      { schema: "unreadable" },
      { schema: "marefa-publication-approvals/1" },
      { schema: "marefa-publication-approvals/1", approvals: "x" },
      {
        schema: "marefa-publication-approvals/1",
        approvals: [null, 1, "x", { decision: 5 }, { decision: "SOURCE_ACCEPT", subject: "x" }],
      },
      "x",
      7,
    ]) {
      const g = live(page, a, TEST_TRUST);
      expect(g.summary.approvals.verified).toBe(0);
      expect(MARKS.some((m) => has(g.page, m))).toBe(false);
    }
  });
  test("unreadable approvals file through the server function", async () => {
    const { page } = withSynthetic();
    const r = await serverPreview(page, "{not json");
    expect(MARKS.some((m) => has(r, m))).toBe(false);
  });
});

// ═════════════ M6 — Q4 عبر annual_position، بلا ازدواج وبلا تدفقات سنوية
describe("M6 quarter table: Q1–Q3 from quarter_position, Q4 from annual_position, no duplicates, no annual flows", () => {
  function q4Page(extraQp: Period[] = []) {
    const p = base();
    const h = fin(p).history;
    h.quarter.periods = ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"].map((end, i) => ({
      period_end: end,
      metrics: {
        revenue: [
          row({
            value: `77701${i}000000`,
            period_end: end,
            period_start: `2025-${String(i * 3 + 1).padStart(2, "0")}-01`,
            fiscal_quarter: i + 1,
          }),
        ],
      },
    }));
    h.quarter_position = {
      status: "available",
      reason: null,
      period_kind: "instant",
      periods: [
        ...["2025-03-31", "2025-06-30", "2025-09-30"].map((end, i) => ({
          period_end: end,
          metrics: { cash: [bal({ value: `77702${i}000000`, period_end: end })] },
        })),
        ...extraQp,
      ],
    };
    h.annual_position.periods = [
      {
        period_end: "2025-12-31",
        metrics: {
          cash: [bal({ value: "777029000000", period_end: "2025-12-31", fiscal_quarter: null })],
        },
      },
    ];
    fin(p).history.annual = {
      status: "available",
      reason: null,
      period_kind: "fy",
      periods: [
        {
          period_end: "2025-12-31",
          metrics: {
            revenue: [
              row({
                value: "777099000000",
                period_kind: "fy",
                period_start: "2025-01-01",
                period_end: "2025-12-31",
              }),
            ],
          },
        },
      ],
    };
    return p;
  }
  const quarterView = (p: EnginePage) =>
    buildCompanyPreview(p).statements.find((v) => v.mode === "quarter")!;
  test("Q1–Q4 cash balances, each once, Q4 from the year-end balance", () => {
    const q = quarterView(q4Page());
    const cash = q.rows.find((r) => r.key === "cash")!;
    const got = Object.fromEntries(q.periods.map((x, i) => [x.end, cash.cells[i]]));
    expect(got["2025-03-31"]).toMatchObject({ state: "value", cell: { value: 777020000000 } });
    expect(got["2025-06-30"]).toMatchObject({ state: "value", cell: { value: 777021000000 } });
    expect(got["2025-09-30"]).toMatchObject({ state: "value", cell: { value: 777022000000 } });
    expect(got["2025-12-31"]).toMatchObject({ state: "value", cell: { value: 777029000000 } });
    expect(cash.section).toBe("balance");
    expect(q.periods.filter((x) => x.end === "2025-12-31").length).toBe(1);
  });
  test("only the fiscal year end of annual_position becomes Q4; any other date there is ignored", () => {
    const p = q4Page();
    fin(p).history.annual_position.periods.push({
      period_end: "2025-11-30",
      metrics: { cash: [bal({ value: "777077000000", period_end: "2025-11-30" })] },
    });
    const q = quarterView(p);
    expect(q.periods.some((x) => x.end === "2025-11-30")).toBe(false);
    expect(has(q, "777077")).toBe(false);
  });
  test("a year-end date inside quarter_position is ignored, so Q4 is never duplicated or contradicted", () => {
    const q = quarterView(
      q4Page([
        {
          period_end: "2025-12-31",
          metrics: { cash: [bal({ value: "777088000000", period_end: "2025-12-31" })] },
        },
      ]),
    );
    const cash = q.rows.find((r) => r.key === "cash")!;
    const i = q.periods.findIndex((x) => x.end === "2025-12-31");
    expect(cash.cells[i]).toMatchObject({ state: "value", cell: { value: 777029000000 } });
    expect(has(q, "777088")).toBe(false);
  });
  test("annual flows never become Q4 flows: the Q4 revenue is the quarterly row, not the FY row", () => {
    const q = quarterView(q4Page());
    const rev = q.rows.find((r) => r.key === "revenue")!;
    const i = q.periods.findIndex((x) => x.end === "2025-12-31");
    expect(rev.cells[i]).toMatchObject({ state: "value", cell: { value: 777013000000 } });
    expect(has(q, "777099")).toBe(false);
  });
  test("without the new quarter_position key nothing changes (frozen fixtures, current engine)", () => {
    for (const s of SYMBOLS) {
      const p = structuredClone(pages[s]) as EnginePage;
      expect(buildCompanyPreview(p)).toEqual(buildCompanyPreview(structuredClone(p)));
      expect(fin(p).history.quarter_position).toBeUndefined();
    }
  });
  test("new quarter balances still go through the gate first (live: withheld without decisions)", () => {
    const { page } = withSynthetic();
    const q = quarterView(live(page, null).page);
    expect(has(q, "77700")).toBe(false);
  });
});

// ═════════════ M7 — صحة التواريخ حسب نهاية السنة المالية
describe("M7 dates: real quarter ends from the company's fiscal year end, including leap February", () => {
  test("fiscal year end validation", () => {
    const ok: [string, number][] = [
      ["12-31", 12],
      ["03-31", 3],
      ["06-30", 6],
      ["09-30", 9],
      ["02-28", 2],
      ["02-29", 2],
      ["05-31", 5],
    ];
    for (const [f, m] of ok) expect([f, fiscalYearEndMonth(f)]).toEqual([f, m]);
    for (const f of [
      "06-31",
      "13-31",
      "00-31",
      "02-30",
      "12-30",
      "bad",
      "",
      null,
      undefined,
      "1-31",
    ])
      expect([f, fiscalYearEndMonth(f)]).toEqual([f, null]);
  });
  test("December year end", () => {
    const k = (d: string) => fiscalDateKind(d, 12);
    expect(["2025-03-31", "2025-06-30", "2025-09-30"].map(k)).toEqual([
      "quarter_end",
      "quarter_end",
      "quarter_end",
    ]);
    expect(k("2025-12-31")).toBe("fy_end");
    for (const d of [
      "2025-08-31",
      "2025-09-29",
      "2025-06-31",
      "2025-02-30",
      "2025-13-31",
      "2025-9-30",
      "x",
    ])
      expect([d, k(d)]).toEqual([d, null]);
  });
  test("March and June year ends", () => {
    expect(
      ["2025-06-30", "2025-09-30", "2025-12-31", "2026-03-31"].map((d) => fiscalDateKind(d, 3)),
    ).toEqual(["quarter_end", "quarter_end", "quarter_end", "fy_end"]);
    expect(
      ["2025-09-30", "2025-12-31", "2026-03-31", "2026-06-30"].map((d) => fiscalDateKind(d, 6)),
    ).toEqual(["quarter_end", "quarter_end", "quarter_end", "fy_end"]);
    expect(fiscalDateKind("2025-03-31", 6)).toBe("quarter_end");
    expect(fiscalDateKind("2025-04-30", 6)).toBe(null);
  });
  test("February year end and leap years", () => {
    expect(fiscalDateKind("2024-02-29", 2)).toBe("fy_end"); // leap year: 29th is the month end
    expect(fiscalDateKind("2024-02-28", 2)).toBe(null); // ... so the 28th is not
    expect(fiscalDateKind("2025-02-28", 2)).toBe("fy_end");
    expect(fiscalDateKind("2025-02-29", 2)).toBe(null); // no such date
    expect(["2025-05-31", "2025-08-31", "2025-11-30"].map((d) => fiscalDateKind(d, 2))).toEqual([
      "quarter_end",
      "quarter_end",
      "quarter_end",
    ]);
    expect(fiscalDateKind("2024-02-29", 11)).toBe("quarter_end"); // November year end: February is a quarter end
    expect(fiscalDateKind("2023-02-28", 11)).toBe("quarter_end");
    expect(fiscalDateKind("2024-02-28", 11)).toBe(null);
  });
  test("integration: a March year-end company gets December as a quarter end, March from annual_position", () => {
    const p = base();
    (p.company as { fiscal_year_end: string }).fiscal_year_end = "03-31";
    const h = fin(p).history;
    h.quarter.periods = [];
    h.quarter_position = {
      status: "available",
      reason: null,
      period_kind: "instant",
      periods: [
        {
          period_end: "2025-12-31",
          metrics: { cash: [bal({ value: "777031000000", period_end: "2025-12-31" })] },
        },
        {
          period_end: "2026-03-31",
          metrics: { cash: [bal({ value: "777032000000", period_end: "2026-03-31" })] },
        }, // FY end: ignored here
        {
          period_end: "2025-11-30",
          metrics: { cash: [bal({ value: "777033000000", period_end: "2025-11-30" })] },
        }, // not a quarter end
      ],
    };
    h.annual_position.periods = [];
    const q = buildCompanyPreview(p).statements.find((v) => v.mode === "quarter")!;
    expect(q.periods.map((x) => x.end)).toEqual(["2025-12-31"]);
    expect(has(q, "777032") || has(q, "777033")).toBe(false);
  });
});

// ═════════════ S0 — الحمولات الاصطناعية وخط الأساس المبني منها
describe("S0 synthetic fixtures and the baseline built from them", () => {
  const files = SYMBOLS.map(
    (s) => new URL(`./fixtures/synthetic-projection/${s}-page.json`, import.meta.url),
  );
  const rows = (p: EnginePage) => {
    const f = p.sections.financials as unknown as Record<
      string,
      { metrics?: Record<string, Row[]> }
    > & {
      history: Record<string, Hist>;
    };
    return [
      ...Object.entries(f)
        .filter(([k]) => k !== "history")
        .flatMap(([, c]) => Object.entries(c.metrics ?? {})),
      ...Object.values(f.history).flatMap((h) =>
        h.periods.flatMap((x) => Object.entries(x.metrics)),
      ),
    ].flatMap(([m, list]) => list.map((r) => [m, r] as const));
  };
  test("fixtures are invented: synthetic issuers, example.invalid sources, 4242 markers only", () => {
    for (const s of SYMBOLS) {
      const p = pages[s] as EnginePage;
      expect(p.company.company_id).toBe(`sa:${s}`);
      expect(p.company.name.startsWith("Synthetic ")).toBe(true);
      for (const [, r] of rows(p)) {
        expect(String(r["source_url"]).startsWith("https://example.invalid/synthetic/")).toBe(true);
        expect(/^(4242\d+|0\.42\d+|4\.2\d+)$/.test(String(r["value"]))).toBe(true);
      }
    }
    const text = files.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(/aramco|tadawul|\b(2222|1120|8010)\b|https?:\/\/(?!example\.invalid)/i.test(text)).toBe(
      false,
    );
  });
  test("the committed baseline is exactly the identities of these sha-pinned fixtures", () => {
    const b = JSON.parse(
      readFileSync(new URL("../src/lib/engine/publication-baseline.json", import.meta.url), "utf8"),
    );
    SYMBOLS.forEach((s, i) =>
      expect(createHash("sha256").update(readFileSync(files[i]!)).digest("hex")).toBe(
        b.fixtures[s],
      ),
    );
    const keys = new Set<string>();
    for (const s of SYMBOLS)
      for (const [m, r] of rows(pages[s] as EnginePage)) {
        const k = frozenRowKey(`sa:${s}`, m, r);
        expect(k).not.toBeNull();
        keys.add(k!);
      }
    expect([...keys].sort()).toEqual(b.keys);
    expect(b.incomplete_identity_rows).toBe(0);
  });
});
