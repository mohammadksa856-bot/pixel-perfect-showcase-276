/**
 * WEB-08B04 — حل مراجع الأدلة. يفشل البناء على أي مرجع لا يُحل (fail closed).
 *
 * يُرجع هوية الدليل ونصه حين يكون نصًا (اقتباس B03 أو حقل ملف تعريف)، ولا يُرجع أبدًا قيمة مقياس مالي:
 * للمقاييس يُرجع المفتاح والوحدة والفترات والبُعد وموضع الاستخراج فقط.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  buildRegister,
  isCivilDate,
  loadB02,
  loadSnapshot,
  type ClaimRecord,
  type Register,
} from "../aramco-disclosures/register";
import { EXTERNAL_REVIEWS, type MetricBucket, type Ref } from "./schema";

const FIXTURE = new URL("../../tests/fixtures/codex-20261013/2222-page.json.gz", import.meta.url);
const B02_WITHHELD = new URL(
  "../../review-delivery/WEB08B02/QUALIFIED-WITHHELD-INPUT-REGISTER-v4.json",
  import.meta.url,
);

type Row = {
  period_kind?: string;
  period_start?: string | null;
  period_end?: string;
  fiscal_year?: number;
  fiscal_quarter?: number | null;
  unit?: string;
  currency?: string | null;
  scope?: string;
  version?: number;
  is_calculated?: number;
  dimensions?: Record<string, string>;
  source_url?: string;
  filed_at?: string;
  provenance?: { extraction?: { page?: number; table_ref?: string } };
};
type ProfileField = {
  value: unknown;
  effective_at?: string;
  provenance?: { source?: { source_url?: string; filed_at?: string } };
};

export type B02Identity = {
  metric: string;
  kind: string;
  fiscalYear: number | null;
  fiscalQuarter: number | null;
  dimensions: Record<string, string>;
};

export type EvidenceContext = {
  register: Register;
  profile: Record<string, ProfileField>;
  ownership: { holder_key: string; holder_name: string; as_of_date: string; source_url: string }[];
  buckets: Record<MetricBucket, Map<string, Row[]>>;
  b02Withheld: B02Identity[];
  b02DocumentKeys: Set<string>;
  capabilities: Record<string, { status: string; count: number; reason: string | null }>;
};

export function loadContext(): EvidenceContext {
  const raw = JSON.parse(gunzipSync(readFileSync(FIXTURE)).toString());
  const fin = raw.sections.financials;
  const byKey = (metrics: Record<string, Row[]> | undefined) =>
    new Map(Object.entries(metrics ?? {}).filter(([, rows]) => Array.isArray(rows) && rows.length));
  const history = (b: string) => {
    const m = new Map<string, Row[]>();
    for (const p of fin.history?.[b]?.periods ?? [])
      for (const [k, rows] of Object.entries(p.metrics as Record<string, Row[]>))
        if (Array.isArray(rows)) m.set(k, [...(m.get(k) ?? []), ...rows]);
    return m;
  };
  const w = JSON.parse(readFileSync(B02_WITHHELD, "utf8"));
  return {
    register: buildRegister(loadSnapshot(), loadB02()),
    profile: raw.sections.profile,
    ownership: raw.sections.ownership,
    buckets: {
      annual: byKey(fin.annual?.metrics),
      quarter: byKey(fin.quarter?.metrics),
      ytd: byKey(fin.ytd?.metrics),
      instant: byKey(fin.instant?.metrics),
      history_annual: history("annual"),
      history_position: history("annual_position"),
      history_quarter: history("quarter"),
    },
    b02Withheld: w.results.map(
      (r: { identity: B02Identity & { fiscalYear: number | null } }): B02Identity => ({
        metric: r.identity.metric,
        kind: r.identity.kind,
        fiscalYear: r.identity.fiscalYear,
        fiscalQuarter: r.identity.fiscalQuarter,
        dimensions: r.identity.dimensions ?? {},
      }),
    ),
    b02DocumentKeys: new Set(loadB02().documents.map((d) => d.key)),
    capabilities: raw.capabilities,
  };
}

/** هوية صف مقياس كاملة (ENG-01/02): كل صف بمصدره وفترته ووحدته وإصداره، دون قيمة. */
export type RowIdentity = {
  period: string;
  kind: string | null;
  start: string | null;
  end: string | null;
  fiscalYear: number | null;
  fiscalQuarter: number | null;
  scope: string | null;
  unit: string | null;
  currency: string | null;
  version: number | null;
  dims: Record<string, string>;
  sourceUrl: string | null;
  filedAt: string | null;
  page: number | null;
  table: string | null;
  calculated: boolean;
};

export type ResolvedRef = {
  ref: Ref;
  label: string;
  /** نص الدليل حين يكون نصًا (للتحقق من الأرقام الواردة في الفقرة)؛ null للهويات. */
  text: string | null;
  source: { url: string | null; filedAt: string | null; page: number | null; table: string | null };
  status: string;
  /** للمقاييس: الفترات المتاحة فقط، دون قيم. */
  periods?: string[];
  unit?: string | null;
  calculated?: boolean;
  /** للمقاييس: هوية كل صف منفردًا؛ لا يُنسب مصدر صف إلى فترات صفوف أخرى. */
  rows?: RowIdentity[];
  /** عدد المصادر المختلفة بين الصفوف؛ إن زاد عن واحد فـ source.url = null. */
  sourceCount?: number;
};

/**
 * تسمية الفترة حسب نوعها لا حسب وجود رقم الربع (ENG-02):
 * fy → FY2025، quarter → 2026Q2، ytd → YTD2026-01-01..2026-06-30، ttm → TTM..النهاية، instant → @التاريخ.
 * نوع غير معروف أو حقول ناقصة → فشل، لا فترة مخترعة.
 */
export function periodLabel(r: Row): string {
  const k = r.period_kind;
  const bad = (why: string): never => {
    throw Error(
      `unlabelled_period:${why}:${JSON.stringify({ k, s: r.period_start, e: r.period_end, fy: r.fiscal_year, fq: r.fiscal_quarter })}`,
    );
  };
  // RR-ENG02-01: هوية الصف تُتحقق قبل الوسم. لا تُختلق بداية أو نهاية ناقصة، ولا يُفترض تقويم المُصدر.
  if (
    r.fiscal_year != null &&
    !(Number.isInteger(r.fiscal_year) && r.fiscal_year >= 1900 && r.fiscal_year <= 2100)
  )
    bad("invalid_fiscal_year");
  if (
    r.fiscal_quarter != null &&
    !(Number.isInteger(r.fiscal_quarter) && r.fiscal_quarter >= 1 && r.fiscal_quarter <= 4)
  )
    bad("invalid_fiscal_quarter");
  if (r.period_start && !isCivilDate(r.period_start)) bad("invalid_start_date");
  if (r.period_end != null && !isCivilDate(r.period_end)) bad("invalid_end_date");
  if (r.period_start && r.period_end && r.period_start > r.period_end) bad("start_after_end");
  if (k === "fy") return r.fiscal_year ? `FY${r.fiscal_year}` : bad("fy_without_year");
  if (k === "quarter")
    return r.fiscal_year && r.fiscal_quarter
      ? `${r.fiscal_year}Q${r.fiscal_quarter}`
      : bad("quarter_identity");
  if (k === "ytd")
    return r.period_end
      ? `YTD${r.period_start ? `${r.period_start}..` : "..."}${r.period_end}`
      : bad("ytd_without_end");
  if (k === "ttm") return r.period_end ? `TTM..${r.period_end}` : bad("ttm_without_end");
  if (k === "instant") return r.period_end ? `@${r.period_end}` : bad("instant_without_end");
  return bad("unknown_kind");
}

const rowIdentity = (r: Row): RowIdentity => ({
  period: periodLabel(r),
  kind: r.period_kind ?? null,
  start: r.period_start || null,
  end: r.period_end ?? null,
  fiscalYear: r.fiscal_year ?? null,
  fiscalQuarter: r.fiscal_quarter ?? null,
  scope: r.scope ?? null,
  unit: r.unit ?? null,
  currency: r.currency ?? null,
  version: r.version ?? null,
  dims: r.dimensions ?? {},
  sourceUrl: r.source_url ?? null,
  filedAt: r.filed_at ?? null,
  page: r.provenance?.extraction?.page ?? null,
  table: r.provenance?.extraction?.table_ref ?? null,
  calculated: r.is_calculated === 1,
});

const sameDims = (a: Record<string, string> = {}, b: Record<string, string> = {}) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

export function resolveRef(ref: Ref, ctx: EvidenceContext): ResolvedRef {
  const fail = (why: string): never => {
    throw Error(`unresolved_ref:${ref.t}:${why}`);
  };
  switch (ref.t) {
    case "b03_claim": {
      const c: ClaimRecord = ctx.register.claims.find((x) => x.id === ref.id) ?? fail(ref.id);
      return {
        ref,
        label: `B03 ${c.id} (${c.category}${c.planKind ? `/${c.planKind}` : ""})`,
        text: c.quote,
        source: {
          url: c.evidence.url,
          filedAt: c.evidence.filedAt,
          page: c.evidence.page,
          table: c.evidence.table,
        },
        status: c.qualification.status,
      };
    }
    case "b03_project": {
      const p = ctx.register.projects.find((x) => x.id === ref.id) ?? fail(ref.id);
      return {
        ref,
        label: `B03 project ${p.id}`,
        text: p.description.map((d) => d.quote ?? "").join(" "),
        source: { url: null, filedAt: null, page: null, table: null },
        status: p.qualification,
      };
    }
    case "b03_event": {
      const e = ctx.register.events.find((x) => x.eventId === ref.id) ?? fail(ref.id);
      return {
        ref,
        label: `B03 record group ${e.eventId} (${e.basis})`,
        text: null,
        source: { url: null, filedAt: e.firstEvidenceFiledAt, page: null, table: null },
        status: "WITHHELD",
      };
    }
    case "engine_profile": {
      const f = ctx.profile[ref.field] ?? fail(ref.field);
      return {
        ref,
        label: `Engine profile: ${ref.field}`,
        text: typeof f.value === "string" ? f.value : JSON.stringify(f.value),
        source: {
          url: f.provenance?.source?.source_url ?? null,
          filedAt: f.provenance?.source?.filed_at ?? null,
          page: null,
          table: null,
        },
        status: "WITHHELD",
      };
    }
    case "engine_ownership": {
      const o = ctx.ownership.find((x) => x.holder_key === ref.holder) ?? fail(ref.holder);
      // اسم المالك وتاريخ السجل فقط؛ نسبة الملكية وعدد الأسهم لا تُنقل.
      return {
        ref,
        label: `Engine ownership: ${o.holder_key}`,
        text: o.holder_name,
        source: { url: o.source_url, filedAt: o.as_of_date, page: null, table: null },
        status: "WITHHELD",
      };
    }
    case "engine_metric": {
      const raw = (ctx.buckets[ref.bucket].get(ref.key) ?? []).filter(
        (r) => !ref.dims || sameDims(r.dimensions, ref.dims),
      );
      if (!raw.length) fail(`${ref.bucket}:${ref.key}:${JSON.stringify(ref.dims ?? {})}`);
      // صف بلا period_kind يأخذ نوع سلته المعروف؛ لا يُستنتج من وجود رقم الربع.
      const KIND_OF: Partial<Record<MetricBucket, string>> = {
        annual: "fy",
        history_annual: "fy",
        history_position: "instant",
        history_quarter: "quarter",
        instant: "instant",
        ytd: "ytd",
        quarter: "quarter",
      };
      const rows = raw.map((r) =>
        rowIdentity({ ...r, period_kind: r.period_kind ?? KIND_OF[ref.bucket] ?? "unknown" }),
      );
      // ENG-01: وحدات أو عملات مختلفة بين الصفوف = مرجع غير متجانس؛ يُرفض بدل تمثيله بوحدة الصف الأول.
      const units = new Set(rows.map((r) => `${r.unit}|${r.currency ?? ""}`));
      if (units.size > 1) fail(`heterogeneous_units:${ref.key}:${[...units].join(",")}`);
      // ENG-01: صفان لنفس الهوية (الفترة والبُعد) بمصدر أو إصدار مختلف = تعارض؛ لا يُختار الأول.
      const byIdentity = new Map<string, RowIdentity>();
      for (const r of rows) {
        const id = `${r.period}|${JSON.stringify(Object.entries(r.dims).sort())}|${r.scope ?? ""}`;
        const prev = byIdentity.get(id);
        if (prev && (prev.sourceUrl !== r.sourceUrl || prev.version !== r.version))
          fail(`conflicting_rows:${ref.key}:${r.period}`);
        if (prev) fail(`duplicate_rows:${ref.key}:${r.period}`);
        byIdentity.set(id, r);
      }
      const sources = [...new Set(rows.map((r) => r.sourceUrl))];
      const single = sources.length === 1 ? rows[0]! : null;
      return {
        ref,
        label: `Engine metric ${ref.key}${ref.dims ? ` ${JSON.stringify(ref.dims)}` : ""} [${ref.bucket}]${sources.length > 1 ? ` — ${sources.length} sources by period` : ""}`,
        text: null,
        source: {
          url: single?.sourceUrl ?? null,
          filedAt: single?.filedAt ?? null,
          page: single && rows.length === 1 ? single.page : null,
          table: single && rows.length === 1 ? single.table : null,
        },
        status: "WITHHELD",
        periods: rows.map((r) => r.period).sort(),
        unit: rows[0]!.unit,
        calculated: rows.some((r) => r.calculated),
        rows: [...rows].sort((a, b) => a.period.localeCompare(b.period)),
        sourceCount: sources.length,
      };
    }
    case "b02_withheld": {
      const ids = ctx.b02Withheld.filter((x) => x.metric === ref.metric);
      if (!ids.length) fail(ref.metric);
      return {
        ref,
        label: `B02 withheld input identity: ${ref.metric} (${ids.length} observations)`,
        text: null,
        source: { url: null, filedAt: null, page: null, table: null },
        status: "WITHHELD",
        periods: [
          ...new Set(
            ids.map((i) =>
              i.fiscalQuarter ? `${i.fiscalYear}Q${i.fiscalQuarter}` : `${i.kind}:${i.fiscalYear}`,
            ),
          ),
        ].sort(),
      };
    }
    case "b02_document": {
      if (!ctx.b02DocumentKeys.has(ref.key)) fail(ref.key);
      const d = loadB02().documents.find((x) => x.key === ref.key)!;
      return {
        ref,
        label: `B02 pinned document ${ref.key}`,
        text: null,
        source: { url: d.url, filedAt: d.published, page: null, table: null },
        status: "PINNED_HASH_NOT_QUALIFIED",
      };
    }
    case "engine_capability": {
      const c = ctx.capabilities[ref.name] ?? fail(ref.name);
      return {
        ref,
        label: `Engine capability ${ref.name}: ${c.status}${c.reason ? ` (${c.reason})` : ""}`,
        text: null,
        source: { url: null, filedAt: null, page: null, table: null },
        status: c.status.toUpperCase(),
      };
    }
    case "external_review": {
      const x = EXTERNAL_REVIEWS[ref.id] ?? fail(ref.id);
      return {
        ref,
        label: `Independent review ${ref.id} @ ${x.sha.slice(0, 7)}`,
        text: x.note,
        source: { url: null, filedAt: null, page: null, table: null },
        status: "REVIEW_RECORD_NOT_APPROVAL",
      };
    }
  }
}

/** حالة مدخل تحليل مالي: لا حالة «مؤهل» لأن لا مدخل مؤهل في هذه المرحلة. */
export type InputStatus =
  "B02_WITHHELD_INPUT" | "UNREVIEWED_ENGINE_FACT" | "UNAPPROVED_DERIVED_METRIC" | "NOT_IN_SNAPSHOT";

export function inputStatus(
  key: string,
  bucket: MetricBucket,
  ctx: EvidenceContext,
  dims?: Record<string, string>,
): InputStatus {
  if (ctx.b02Withheld.some((x) => x.metric === key)) return "B02_WITHHELD_INPUT";
  const rows = (ctx.buckets[bucket].get(key) ?? []).filter(
    (r) => !dims || sameDims(r.dimensions, dims),
  );
  if (!rows.length) return "NOT_IN_SNAPSHOT";
  return rows.some((r) => r.is_calculated === 1)
    ? "UNAPPROVED_DERIVED_METRIC"
    : "UNREVIEWED_ENGINE_FACT";
}

/** كل قيم المقاييس في اللقطة كنصوص؛ للتحقق من عدم تسربها إلى المخرجات (اختبارات). */
export function allMetricValueStrings(ctx: EvidenceContext): Set<string> {
  const out = new Set<string>();
  const raw = JSON.parse(gunzipSync(readFileSync(FIXTURE)).toString());
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      for (const k of ["value", "value_text", "raw_value"])
        if (o[k] !== null && o[k] !== undefined && /\d{3,}/.test(String(o[k])))
          out.add(String(o[k]));
      Object.values(o).forEach(visit);
    }
  };
  visit(raw.sections.financials);
  visit(raw.sections.ownership);
  visit(raw.sections.market);
  void ctx;
  return out;
}
