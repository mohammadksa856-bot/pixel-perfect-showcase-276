// خادم فقط: بوابة أهلية العرض للحقائق المالية، تُطبَّق على حمولة المحرك قبل بناء النموذج وتسلسله إلى أي استجابة.
//
// القرارات منفصلة ولا يغني أحدها عن الآخر: SOURCE_ACCEPT، FINANCIAL_ACCEPT، PUBLICATION_AUTHORIZED، و WITHHELD.
// وجود هذه الكلمات في JSON ليس قرارًا: القرار سجل موقَّع (Ed25519) من جهة مدرجة في مخزن الثقة
// المثبّت في المستودع (publication-trust.json) ومخوّلة لهذا النوع من القرار، ومرتبط ببصمة الهوية الكاملة للصف،
// وله مرجع قرار وتاريخ إصدار وانتهاء اختياري. مخزن الثقة فارغ حاليًا، فلا يمر أي صف في المسار الحي.
// لا يوجد أي مدخل في مسار الخادم يغيّر مخزن الثقة (لا متغير بيئة ولا معامل): الاختبارات لا تستطيع اصطناع اعتماد عام.
//
// المسار المجمّد (fixture التصميم المقبول، المثبّت بالبصمة) وحده يقبل خط الأساس: 521 هوية من البيانات المجمّدة.
// المسار الحي لا يستعمل خط الأساس إطلاقًا.
// كل ما هو ناقص أو متناقض أو بنوع غير متوقع يفشل مغلقًا: يُحذف الصف قبل البناء، ولا تُرمى أخطاء.
import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { readFileSync } from "node:fs";
import type { EnginePage } from "./company-preview";
import type { EnginePeerResponse } from "./peer-comparison";
import BASELINE from "./publication-baseline.json";
import TRUST from "./publication-trust.json";

type Env = Record<string, string | undefined>;
type Obj = Record<string, unknown>;

export const APPROVALS_SCHEMA = "marefa-publication-approvals/1";
export type Decision = "SOURCE_ACCEPT" | "FINANCIAL_ACCEPT" | "PUBLICATION_AUTHORIZED" | "WITHHELD";
const REQUIRED: Decision[] = ["SOURCE_ACCEPT", "FINANCIAL_ACCEPT", "PUBLICATION_AUTHORIZED"];
const DECISIONS = new Set<string>([...REQUIRED, "WITHHELD"]);
export const PERIOD_KINDS = new Set(["fy", "quarter", "ytd", "ttm", "instant"]);

export type TrustStore = {
  schema: "marefa-publication-trust/1";
  authorities: {
    authority_id: string;
    public_key_spki_der_b64: string;
    decisions: Decision[];
    revoked?: boolean;
  }[];
};

export type Approval = {
  decision: Decision;
  decision_ref: string;
  authority_id: string;
  subject: { kind: "fact"; key: string };
  issued_at: string;
  expires_at?: string | null;
  signature: string;
};

export type GateMode = "frozen_design_fixture" | "live_engine";

export type GateReason =
  | "malformed_container"
  | "identity_incomplete"
  | "identity_contradictory"
  | "not_in_frozen_baseline"
  | "explicit_withheld"
  | "no_verified_source_accept"
  | "no_verified_financial_accept"
  | "no_verified_publication_authorization"
  | "peer_contract_lacks_identity";

export type GateSummary = {
  mode: GateMode;
  baseline_rows: number;
  approved_rows: number;
  withheld_rows: number;
  reasons: Partial<Record<GateReason, number>>;
  approvals: {
    records: number;
    verified: number;
    rejected: number;
    state: "absent" | "valid" | "invalid";
  };
};

const isObj = (x: unknown): x is Obj => !!x && typeof x === "object" && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === "string";
const nonEmpty = (x: unknown): x is string => isStr(x) && x.trim() !== "";
const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const sortObj = (d: Obj) =>
  Object.fromEntries(Object.entries(d).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** تاريخ تقويمي حقيقي بصيغة YYYY-MM-DD (يرفض 2025-02-30 و2025-13-31). */
export function isCalendarDate(s: unknown): s is string {
  if (!isStr(s) || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const UNIT_CURRENCY = /^([A-Z]{3})(\/.+)?$/;

export type StrictIdentity = {
  company_id: string;
  metric: string;
  period_kind: string;
  period_start: string | null;
  period_end: string;
  scope: string;
  dimensions: Record<string, string>;
  currency: string;
  unit: string;
  version: number;
  source_key: string;
  value: string | null;
};

/**
 * الهوية الصارمة للمسار الحي: كل حقل موجود صراحةً وبنوعه، بلا أي قيمة افتراضية. يعيد سبب الرفض أو الهوية.
 * - period_start: تاريخ صالح ≤ النهاية للتدفقات؛ غائب صراحةً (null أو "") للأرصدة instant.
 * - currency: مطابقة للوحدة إن كانت الوحدة عملة (SAR أو SAR/share)؛ فارغة فقط لوحدة غير نقدية.
 */
export function strictIdentity(
  companyId: unknown,
  metric: string,
  r: unknown,
): StrictIdentity | "identity_incomplete" | "identity_contradictory" {
  if (!isObj(r) || !nonEmpty(companyId) || !nonEmpty(metric)) return "identity_incomplete";
  for (const k of [
    "period_kind",
    "period_start",
    "period_end",
    "scope",
    "dimensions",
    "currency",
    "unit",
    "version",
    "source_key",
    "value",
  ])
    if (!(k in r)) return "identity_incomplete";
  const {
    period_kind: kind,
    period_start: start,
    period_end: end,
    scope,
    dimensions,
    currency,
    unit,
    version,
    source_key: src,
    value,
  } = r;
  if (
    !isStr(kind) ||
    !PERIOD_KINDS.has(kind) ||
    !isCalendarDate(end) ||
    !nonEmpty(scope) ||
    !nonEmpty(unit) ||
    !nonEmpty(src)
  )
    return "identity_incomplete";
  if (!isObj(dimensions) || !Object.values(dimensions).every(isStr)) return "identity_incomplete";
  if (!isStr(currency)) return "identity_incomplete";
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1)
    return "identity_incomplete";
  if (!(value === null || (isStr(value) && value.trim() !== "" && Number.isFinite(Number(value)))))
    return "identity_incomplete";
  const instant = kind === "instant";
  const noStart = start === null || start === "";
  if (instant && !noStart) return "identity_contradictory"; // a balance has no start date
  if (!instant && noStart) return "identity_incomplete"; // a flow needs its start date
  if (!instant && (!isCalendarDate(start) || start > end)) return "identity_contradictory";
  // Monetary unit (SAR, SAR/share, USD/boe): the currency must be that code. Non-monetary unit: no currency.
  const m = UNIT_CURRENCY.exec(unit);
  if (m ? currency !== m[1] : currency !== "") return "identity_contradictory";
  return {
    company_id: companyId,
    metric,
    period_kind: kind,
    period_start: instant ? null : (start as string),
    period_end: end,
    scope,
    dimensions: sortObj(dimensions) as Record<string, string>,
    currency,
    unit,
    version,
    source_key: src,
    value: value as string | null,
  };
}

/** بصمة الهوية الصارمة؛ موضوع القرارات الموقّعة. */
export function strictKey(i: StrictIdentity): string {
  return sha([
    "fact/2",
    i.company_id,
    i.metric,
    i.period_kind,
    i.period_start,
    i.period_end,
    i.scope,
    i.dimensions,
    i.currency,
    i.unit,
    i.version,
    i.source_key,
    i.value,
  ]);
}

/**
 * مفتاح خط الأساس المجمّد: نفس الصيغة التي بُني بها publication-baseline.json من الـfixtures المقبولة.
 * يُستعمل في المسار المجمّد فقط، ولا يُستعمل أبدًا لإجازة صف من المحرك الحي.
 */
export function frozenRowKey(companyId: string, metric: string, r: unknown): string | null {
  if (
    !isObj(r) ||
    !companyId ||
    !metric ||
    !nonEmpty(r["period_kind"]) ||
    !nonEmpty(r["period_end"]) ||
    typeof r["version"] !== "number" ||
    !nonEmpty(r["source_key"])
  )
    return null;
  const dims = isObj(r["dimensions"]) ? sortObj(r["dimensions"]) : {};
  return sha([
    "fact",
    companyId,
    metric,
    r["period_kind"],
    (r["period_start"] as string) || null,
    r["period_end"],
    (r["scope"] as string) ?? "consolidated",
    dims,
    (r["currency"] as string) ?? null,
    (r["unit"] as string) ?? null,
    r["version"],
    r["source_key"],
    (r["value"] as string) ?? null,
  ]);
}

/** الحمولة الموقّعة لقرار: ترتيب ثابت للحقول. */
export function approvalPayload(a: Omit<Approval, "signature">): string {
  return JSON.stringify([
    APPROVALS_SCHEMA,
    a.decision,
    a.decision_ref,
    a.authority_id,
    a.subject.kind,
    a.subject.key,
    a.issued_at,
    a.expires_at ?? null,
  ]);
}

type Verified = {
  byKey: Map<string, Set<Decision>>;
  withheld: Set<string>;
  summary: GateSummary["approvals"];
};

/** يتحقق من كل سجل: جهة مدرجة وغير ملغاة ومخوّلة لهذا القرار، توقيع صالح، إصدار ≤ الآن، غير منتهٍ. */
export function verifyApprovals(records: unknown, trust: TrustStore, now: Date): Verified {
  const out: Verified = {
    byKey: new Map(),
    withheld: new Set(),
    summary: { records: 0, verified: 0, rejected: 0, state: "absent" },
  };
  if (records === null || records === undefined) return out;
  if (
    !isObj(records) ||
    records["schema"] !== APPROVALS_SCHEMA ||
    !Array.isArray(records["approvals"])
  ) {
    out.summary.state = "invalid";
    return out;
  }
  out.summary.state = "valid";
  const auth = new Map(
    (Array.isArray(trust?.authorities) ? trust.authorities : []).map((a) => [a.authority_id, a]),
  );
  for (const a of records["approvals"] as unknown[]) {
    out.summary.records++;
    const ok = (() => {
      if (
        !isObj(a) ||
        !isStr(a["decision"]) ||
        !DECISIONS.has(a["decision"]) ||
        !nonEmpty(a["decision_ref"]) ||
        !nonEmpty(a["authority_id"]) ||
        !isObj(a["subject"]) ||
        a["subject"]["kind"] !== "fact" ||
        !/^[0-9a-f]{64}$/.test(String(a["subject"]["key"])) ||
        !nonEmpty(a["issued_at"]) ||
        !nonEmpty(a["signature"])
      )
        return false;
      // WITHHELD من أي سجل مفهوم يحجب (الفشل نحو مزيد من الحجب)، حتى لو لم يتحقق توقيعه.
      if (a["decision"] === "WITHHELD") out.withheld.add(String(a["subject"]["key"]));
      const issued = Date.parse(a["issued_at"] as string);
      if (isNaN(issued) || issued > now.getTime()) return false;
      if (a["expires_at"] !== undefined && a["expires_at"] !== null) {
        const exp = Date.parse(String(a["expires_at"]));
        if (isNaN(exp) || exp <= now.getTime()) return false;
      }
      const who = auth.get(a["authority_id"] as string);
      if (!who || who.revoked || !who.decisions.includes(a["decision"] as Decision)) return false;
      try {
        const key = createPublicKey({
          key: Buffer.from(who.public_key_spki_der_b64, "base64"),
          format: "der",
          type: "spki",
        });
        if (key.asymmetricKeyType !== "ed25519") return false;
        return verifySignature(
          null,
          Buffer.from(approvalPayload(a as unknown as Approval)),
          key,
          Buffer.from(a["signature"] as string, "base64"),
        );
      } catch {
        return false;
      }
    })();
    if (!ok) {
      out.summary.rejected++;
      continue;
    }
    out.summary.verified++;
    const k = String((a as Obj & { subject: Obj })["subject"]["key"]);
    out.byKey.set(k, new Set([...(out.byKey.get(k) ?? []), (a as Obj)["decision"] as Decision]));
  }
  return out;
}

const BASELINE_KEYS: ReadonlySet<string> = new Set(
  isObj(BASELINE) && Array.isArray((BASELINE as Obj)["keys"])
    ? ((BASELINE as Obj)["keys"] as string[])
    : [],
);
const COMMITTED_TRUST = TRUST as unknown as TrustStore;

/** مسارات المؤشرات في الحمولة: لقطات الفترات وسجلات التاريخ. أي حاوية بشكل غير متوقع تُفرَّغ. */
function containers(fin: Obj, onMalformed: () => void): Obj[] {
  const out: Obj[] = [];
  for (const [k, v] of Object.entries(fin)) {
    if (k === "history") continue;
    if (v === null || v === undefined) continue;
    if (!isObj(v)) {
      onMalformed();
      delete fin[k];
      continue;
    }
    out.push(v);
  }
  const history = fin["history"];
  if (history === undefined || history === null) return out;
  if (!isObj(history)) {
    onMalformed();
    fin["history"] = {};
    return out;
  }
  for (const [k, h] of Object.entries(history)) {
    if (!isObj(h) || !Array.isArray(h["periods"])) {
      onMalformed();
      delete history[k];
      continue;
    }
    h["periods"] = (h["periods"] as unknown[]).filter((p) =>
      isObj(p) && isStr(p["period_end"]) ? true : (onMalformed(), false),
    );
    out.push(...(h["periods"] as Obj[]));
  }
  return out;
}

/**
 * يعيد نسخة من الحمولة بلا أي صف غير مؤهل، وملخصًا بلا قيم. لا يرمي أخطاء.
 * - frozen_design_fixture: يمر صف خط الأساس المجمّد؛ ويحجب WITHHELD صريح.
 * - live_engine: لا خط أساس؛ يمر الصف فقط بقرارات موقّعة ثلاثة صالحة لهويته الصارمة.
 */
export function applyPublicationGate(
  page: EnginePage,
  approvals: unknown,
  opts: { mode: GateMode; now?: Date; trust?: TrustStore },
): { page: EnginePage; summary: GateSummary } {
  const now = opts.now ?? new Date();
  const trust = opts.trust ?? COMMITTED_TRUST;
  const ver = verifyApprovals(approvals, trust, now);
  const summary: GateSummary = {
    mode: opts.mode,
    baseline_rows: 0,
    approved_rows: 0,
    withheld_rows: 0,
    reasons: {},
    approvals: ver.summary,
  };
  const withhold = (reason: GateReason, n = 1) => {
    summary.withheld_rows += n;
    summary.reasons[reason] = (summary.reasons[reason] ?? 0) + n;
  };
  let out: Obj;
  try {
    out = structuredClone(page) as unknown as Obj;
  } catch {
    return {
      page: { sections: { financials: {} } } as unknown as EnginePage,
      summary: (withhold("malformed_container"), summary),
    };
  }
  if (!isObj(out))
    return {
      page: out as unknown as EnginePage,
      summary: (withhold("malformed_container"), summary),
    };
  const company = isObj(out["company"]) ? out["company"]["company_id"] : undefined;
  const sections = isObj(out["sections"]) ? out["sections"] : null;
  if (!sections) return { page: out as unknown as EnginePage, summary };
  if (sections["financials"] === undefined) return { page: out as unknown as EnginePage, summary };
  if (!isObj(sections["financials"])) {
    sections["financials"] = {};
    withhold("malformed_container");
    return { page: out as unknown as EnginePage, summary };
  }
  const fin = sections["financials"] as Obj;
  for (const c of containers(fin, () => withhold("malformed_container"))) {
    const metrics = c["metrics"];
    if (metrics === undefined) continue;
    if (!isObj(metrics)) {
      delete c["metrics"];
      withhold("malformed_container");
      continue;
    }
    for (const [metric, rows] of Object.entries(metrics)) {
      if (!Array.isArray(rows)) {
        delete metrics[metric];
        withhold("malformed_container");
        continue;
      }
      const kept = rows.filter((r) => {
        if (opts.mode === "frozen_design_fixture") {
          const key = isStr(company) ? frozenRowKey(company, metric, r) : null;
          if (!key) return (withhold("identity_incomplete"), false);
          const id = strictIdentity(company, metric, r);
          if (ver.withheld.has(key) || (typeof id !== "string" && ver.withheld.has(strictKey(id))))
            return (withhold("explicit_withheld"), false);
          if (!BASELINE_KEYS.has(key)) return (withhold("not_in_frozen_baseline"), false);
          summary.baseline_rows++;
          return true;
        }
        const id = strictIdentity(company, metric, r);
        if (typeof id === "string") return (withhold(id), false);
        const key = strictKey(id);
        if (ver.withheld.has(key)) return (withhold("explicit_withheld"), false);
        const got = ver.byKey.get(key) ?? new Set<Decision>();
        if (!got.has("SOURCE_ACCEPT")) return (withhold("no_verified_source_accept"), false);
        if (!got.has("FINANCIAL_ACCEPT")) return (withhold("no_verified_financial_accept"), false);
        if (!got.has("PUBLICATION_AUTHORIZED"))
          return (withhold("no_verified_publication_authorization"), false);
        summary.approved_rows++;
        return true;
      });
      if (kept.length) metrics[metric] = kept;
      else delete metrics[metric];
    }
  }
  const history = fin["history"];
  if (isObj(history))
    for (const h of Object.values(history))
      if (isObj(h) && Array.isArray(h["periods"]))
        h["periods"] = (h["periods"] as Obj[]).filter(
          (p) => isObj(p["metrics"]) && Object.keys(p["metrics"] as Obj).length > 0,
        );
  return { page: out as unknown as EnginePage, summary };
}

/**
 * مقارنة النظراء: عقد /peers (v4) لا يحمل مفتاح المصدر ولا الإصدار ولا بداية الفترة، فلا هوية تُربط بقرار.
 * لذلك تُفرَّغ كل القيم على الخادم (تظهر محجوبة) حتى يُعدَّل العقد. لا يوجد مسار سجل للنظراء.
 */
export function applyPeerGate(resp: unknown): {
  resp: EnginePeerResponse | null;
  withheld: number;
} {
  if (!isObj(resp) || !Array.isArray(resp["companies"])) return { resp: null, withheld: 0 };
  let out: Obj;
  try {
    out = structuredClone(resp);
  } catch {
    return { resp: null, withheld: 0 };
  }
  let withheld = 0;
  out["companies"] = (out["companies"] as unknown[]).filter(isObj);
  for (const c of out["companies"] as Obj[]) {
    if (!isObj(c["metrics"])) {
      c["metrics"] = {};
      continue;
    }
    for (const [k, m] of Object.entries(c["metrics"] as Obj)) {
      if (!isObj(m)) {
        delete (c["metrics"] as Obj)[k];
        withheld++;
        continue;
      }
      if (m["value"] !== null && m["value"] !== undefined) withheld++;
      m["value"] = null;
    }
  }
  return { resp: out as unknown as EnginePeerResponse, withheld };
}

/** يقرأ سجل القرارات من مسار خادم صريح. الغياب = لا قرارات؛ تعذر القراءة أو التحليل = سجل مشوّه (يفشل مغلقًا). */
export function loadApprovals(env: Env = process.env): unknown {
  const path = env["MAREFA_PUBLICATION_APPROVALS_PATH"];
  if (!path) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { schema: "unreadable" };
  }
}

/** مخزن الثقة الذي يستعمله الخادم: الملف المثبّت في المستودع فقط. للاختبار والمراجعة. */
export const committedTrustStore = (): TrustStore => COMMITTED_TRUST;
