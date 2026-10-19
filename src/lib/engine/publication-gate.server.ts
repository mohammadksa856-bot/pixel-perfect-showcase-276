// خادم فقط: بوابة أهلية العرض للحقائق المالية، تُطبَّق على حمولة المحرك قبل بناء النموذج وتسلسله إلى أي استجابة.
//
// الحالات منفصلة ولا يغني أحدها عن الآخر:
//   SOURCE_ACCEPT        مطابقة القيمة لمصدرها الأصلي (إيصال مراجعة مستقل).
//   FINANCIAL_ACCEPT     القبول المالي للقيمة.
//   PUBLICATION_AUTHORIZED حق العرض/النشر (أساس الحقوق).
//   WITHHELD             حجب صريح؛ يغلب كل ما سبق.
//
// القاعدة: صف موجود في خط الأساس المقبول (هويات البيانات المجمّدة المقبولة) يبقى كما هو.
// أي صف آخر لا يمر إلا بقيد في السجل يطابق هويته الكاملة (بما فيها الإصدار ومفتاح المصدر والقيمة) ويحمل الحالات الثلاث.
// كل ما هو مجهول أو ناقص أو مشوّه يفشل مغلقًا: يُحذف الصف من الحمولة قبل البناء، فلا تصل قيمته إلى أي استجابة.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { EngineMetricRow, EnginePage } from "./company-preview";
import type { EnginePeerResponse } from "./peer-comparison";
import BASELINE from "./publication-baseline.json";

type Env = Record<string, string | undefined>;
type Row = EngineMetricRow & {
  version?: number | null;
  source_key?: string | null;
};

export const LEDGER_SCHEMA = "marefa-publication-ledger/1";

export type FactIdentity = {
  company_id: string;
  metric: string;
  period_kind: string;
  period_start: string | null;
  period_end: string;
  scope: string;
  dimensions: Record<string, string>;
  currency: string | null;
  unit: string | null;
  version: number;
  source_key: string;
  value: string | null;
};

export type PeerIdentity = {
  market: string;
  symbol: string;
  metric: string;
  period_kind: string;
  period_end: string;
  unit: string | null;
  value: string;
};

type Accepts = {
  source_accept?: { state?: string; receipt_sha256?: string; reviewer?: string } | null;
  financial_accept?: { state?: string; by?: string; at?: string } | null;
  publication?: {
    state?: string;
    rights_basis?: string;
    by?: string;
    at?: string;
    expires_at?: string | null;
  } | null;
  withheld?: boolean;
};

export type LedgerEntry =
  | ({ kind: "fact"; identity: FactIdentity } & Accepts)
  | ({ kind: "peer_metric"; identity: PeerIdentity } & Accepts);

export type Ledger = { schema: typeof LEDGER_SCHEMA; entries: LedgerEntry[] };

export type GateReason =
  | "identity_incomplete"
  | "not_in_baseline_or_ledger"
  | "explicit_withheld"
  | "ledger_conflict"
  | "source_accept_missing"
  | "financial_accept_missing"
  | "publication_authorization_missing"
  | "publication_authorization_expired"
  | "ledger_invalid";

export type GateSummary = {
  baseline_rows: number;
  authorized_rows: number;
  withheld_rows: number;
  reasons: Partial<Record<GateReason, number>>;
  ledger: "absent" | "valid" | "invalid";
};

const canonDims = (d: Record<string, unknown> | null | undefined) =>
  Object.fromEntries(Object.entries(d ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");

/** الهوية الكاملة لصف من الحمولة. null إن نقص أي حقل يدخل في الهوية. */
export function factIdentity(companyId: string, metric: string, r: Row): FactIdentity | null {
  if (
    !companyId ||
    !metric ||
    !r.period_kind ||
    !r.period_end ||
    typeof r.version !== "number" ||
    !r.source_key
  )
    return null;
  return {
    company_id: companyId,
    metric,
    period_kind: r.period_kind,
    period_start: r.period_start || null,
    period_end: r.period_end,
    scope: r.scope ?? "consolidated",
    dimensions: canonDims(r.dimensions) as Record<string, string>,
    currency: r.currency ?? null,
    unit: r.unit ?? null,
    version: r.version,
    source_key: r.source_key,
    value: r.value ?? null,
  };
}

/** بصمة الهوية بترتيب حقول ثابت (لا يعتمد على ترتيب مفاتيح الكائن الوارد). */
export function factKey(i: FactIdentity): string {
  return sha([
    "fact",
    i.company_id,
    i.metric,
    i.period_kind,
    i.period_start ?? null,
    i.period_end,
    i.scope,
    canonDims(i.dimensions),
    i.currency ?? null,
    i.unit ?? null,
    i.version,
    i.source_key,
    i.value ?? null,
  ]);
}

export function peerKey(i: PeerIdentity): string {
  return sha([
    "peer",
    i.market.toUpperCase(),
    i.symbol.toUpperCase(),
    i.metric,
    i.period_kind,
    i.period_end,
    i.unit ?? null,
    i.value,
  ]);
}

const HEX64 = /^[0-9a-f]{64}$/;
const nonEmpty = (s: unknown) => typeof s === "string" && s.trim() !== "";

/** أهلية قيد واحد للعرض العام. لا يكفي أي شرطين من ثلاثة. */
export function entryVerdict(e: Accepts, now: Date): GateReason | null {
  if (e.withheld === true) return "explicit_withheld";
  const s = e.source_accept;
  if (
    !s ||
    s.state !== "SOURCE_ACCEPT" ||
    !HEX64.test(s.receipt_sha256 ?? "") ||
    !nonEmpty(s.reviewer)
  )
    return "source_accept_missing";
  const f = e.financial_accept;
  if (
    !f ||
    f.state !== "FINANCIAL_ACCEPT" ||
    !nonEmpty(f.by) ||
    !nonEmpty(f.at) ||
    isNaN(Date.parse(f.at!))
  )
    return "financial_accept_missing";
  const p = e.publication;
  if (
    !p ||
    p.state !== "PUBLICATION_AUTHORIZED" ||
    !nonEmpty(p.rights_basis) ||
    !nonEmpty(p.by) ||
    !nonEmpty(p.at) ||
    isNaN(Date.parse(p.at!))
  )
    return "publication_authorization_missing";
  if (p.expires_at !== undefined && p.expires_at !== null) {
    const t = Date.parse(p.expires_at);
    if (isNaN(t) || t <= now.getTime()) return "publication_authorization_expired";
  }
  return null;
}

type Index = {
  facts: Map<string, LedgerEntry[]>;
  peers: Map<string, LedgerEntry[]>;
  state: GateSummary["ledger"];
};

/** سجل مشوّه أو بمخطط غير معروف = لا قيود (لا يمر أي صف جديد)، مع بقاء خط الأساس. */
export function indexLedger(ledger: unknown): Index {
  const idx: Index = { facts: new Map(), peers: new Map(), state: "absent" };
  if (ledger === null || ledger === undefined) return idx;
  const l = ledger as Partial<Ledger>;
  if (l.schema !== LEDGER_SCHEMA || !Array.isArray(l.entries)) return { ...idx, state: "invalid" };
  const add = (m: Map<string, LedgerEntry[]>, k: string, e: LedgerEntry) =>
    m.set(k, [...(m.get(k) ?? []), e]);
  for (const e of l.entries) {
    if (e?.kind === "fact" && e.identity) {
      const id = e.identity as FactIdentity;
      if (
        !id.company_id ||
        !id.metric ||
        !id.period_kind ||
        !id.period_end ||
        typeof id.version !== "number" ||
        !id.source_key
      )
        continue;
      add(idx.facts, factKey(id), e);
    } else if (e?.kind === "peer_metric" && e.identity) {
      const id = e.identity as PeerIdentity;
      if (
        !id.market ||
        !id.symbol ||
        !id.metric ||
        !id.period_kind ||
        !id.period_end ||
        !nonEmpty(id.value)
      )
        continue;
      add(idx.peers, peerKey(id), e);
    }
  }
  return { ...idx, state: "valid" };
}

function decide(entries: LedgerEntry[] | undefined, now: Date): GateReason | null {
  if (!entries?.length) return "not_in_baseline_or_ledger";
  if (entries.some((e) => e.withheld === true)) return "explicit_withheld";
  const verdicts = entries.map((e) => entryVerdict(e, now));
  // قيدان للهوية نفسها يختلفان في الحكم: تعارض، لا اختيار.
  if (new Set(verdicts).size > 1) return "ledger_conflict";
  return verdicts[0]!;
}

const BASELINE_KEYS: ReadonlySet<string> = new Set((BASELINE as { keys: string[] }).keys);

type MetricMap = Record<string, Row[]>;

/**
 * يعيد نسخة من الحمولة بلا أي صف غير مؤهل، وملخصًا بلا قيم.
 * الصفوف المحذوفة لا تترك أثرًا رقميًا؛ الفترة التي تفرغ من كل مقاييسها تُحذف من السجل التاريخي.
 */
export function applyPublicationGate(
  page: EnginePage,
  ledger: unknown,
  opts: { now?: Date; baseline?: ReadonlySet<string> } = {},
): { page: EnginePage; summary: GateSummary } {
  const now = opts.now ?? new Date();
  const baseline = opts.baseline ?? BASELINE_KEYS;
  const idx = indexLedger(ledger);
  const summary: GateSummary = {
    baseline_rows: 0,
    authorized_rows: 0,
    withheld_rows: 0,
    reasons: {},
    ledger: idx.state,
  };
  const out = structuredClone(page);
  const companyId = (out.company as { company_id?: string } | undefined)?.company_id ?? "";
  const withhold = (reason: GateReason) => {
    summary.withheld_rows++;
    summary.reasons[reason] = (summary.reasons[reason] ?? 0) + 1;
  };
  const gateMetrics = (metrics: MetricMap | undefined) => {
    if (!metrics) return;
    for (const [metric, rows] of Object.entries(metrics)) {
      const kept = (rows ?? []).filter((r) => {
        const id = factIdentity(companyId, metric, r);
        if (!id) return (withhold("identity_incomplete"), false);
        const key = factKey(id);
        const entries = idx.facts.get(key);
        // WITHHELD الصريح يغلب خط الأساس أيضًا.
        if (entries?.some((e) => e.withheld === true))
          return (withhold("explicit_withheld"), false);
        if (baseline.has(key)) return (summary.baseline_rows++, true);
        const reason = idx.state === "invalid" ? "ledger_invalid" : decide(entries, now);
        if (reason) return (withhold(reason), false);
        summary.authorized_rows++;
        return true;
      });
      if (kept.length) metrics[metric] = kept;
      else delete metrics[metric];
    }
  };
  const fin = (out.sections?.financials ?? {}) as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(fin)) {
    if (k === "history") continue;
    gateMetrics((v as { metrics?: MetricMap } | null)?.metrics);
  }
  const history = (fin["history"] ?? {}) as Record<string, { periods?: { metrics?: MetricMap }[] }>;
  for (const h of Object.values(history)) {
    if (!h?.periods) continue;
    for (const p of h.periods) gateMetrics(p.metrics);
    h.periods = h.periods.filter((p) => Object.keys(p.metrics ?? {}).length > 0);
  }
  return { page: out, summary };
}

/** مقارنة النظراء: لا خط أساس مقبول لها، فكل قيمة تحتاج قيدًا مؤهلًا وإلا تُفرَّغ (تظهر محجوبة). */
export function applyPeerGate(
  resp: EnginePeerResponse,
  ledger: unknown,
  opts: { now?: Date } = {},
): { resp: EnginePeerResponse; withheld: number } {
  const now = opts.now ?? new Date();
  const idx = indexLedger(ledger);
  const out = structuredClone(resp);
  let withheld = 0;
  for (const c of out.companies ?? []) {
    for (const [metric, m] of Object.entries(c.metrics ?? {})) {
      if (m.value === null || m.value === undefined || m.value === "") continue;
      const ok =
        idx.state === "valid" &&
        !!m.period_kind &&
        !!m.period_end &&
        decide(
          idx.peers.get(
            peerKey({
              market: c.market,
              symbol: c.symbol,
              metric,
              period_kind: m.period_kind,
              period_end: m.period_end,
              unit: m.unit ?? null,
              value: m.value,
            }),
          ),
          now,
        ) === null;
      if (!ok) {
        m.value = null;
        withheld++;
      }
    }
  }
  return { resp: out, withheld };
}

/** يقرأ السجل من مسار خادم صريح. غيابه = لا قيود؛ تعذر قراءته أو تحليله = سجل مشوّه (يفشل مغلقًا). */
export function loadLedger(env: Env = process.env): unknown {
  const path = env["MAREFA_PUBLICATION_LEDGER_PATH"];
  if (!path) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { schema: "unreadable" };
  }
}
