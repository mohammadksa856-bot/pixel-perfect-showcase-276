import type { EngineMetricRow, EnginePage } from "./company-preview";

/**
 * W0 (QA خاص): ربط أدلة مراجعة بقيم الحمولة الحالية دون تغيير المحرك أو الـfixture أو حالة أي خلية.
 * الربط بالهوية المالية الكاملة فقط: الشركة، المقياس، نوع الفترة وبدايتها ونهايتها وسنتها وربعها، العملة،
 * الوحدة والمقياس، النطاق والأبعاد، الإصدار، مفتاح المصدر وبصمته ورابطه، نوع الإيداع وتاريخه، والمبلغ.
 * لا بديل ولا تحويل: أي اختلاف أو حقل ناقص أو تعارض في الحمولة يرفض الربط. لا تُرفع حالة WITHHELD.
 * هذه الوحدة لا تُستدعى إلا من مسار المراجع المحمي على الخادم (qa-evidence.server.ts).
 */
export type EvidenceKey = {
  companyId: string;
  metric: string;
  periodKind: "fy" | "instant" | "quarter" | "ytd";
  periodStart: string | null;
  periodEnd: string;
  fiscalYear: number;
  fiscalQuarter: number | null;
  currency: string;
  unit: string;
  scale: string;
  scope: string;
  dimensions: Record<string, string>;
  version: number;
  sourceKey: string;
  sourceContentHash: string;
  sourceUrl: string;
  filingType: string;
  filedAt: string;
  amount: string;
};

export type EvidenceRef = {
  record: string;
  document: string;
  sha256: string;
  pdfPage: number;
  printedPage: number | null;
  line: string;
  review: string;
};

export type EvidenceOverlay = {
  schema: "marefa-qa-evidence-overlay/2";
  scope: "QA_PRIVATE";
  fixture: { companyId: string; generatedAt: string; contractVersion: number };
  entries: { key: EvidenceKey; evidence: EvidenceRef }[];
};

export type EvidenceBinding = {
  key: EvidenceKey;
  evidence: EvidenceRef;
  qualification: "WITHHELD";
  display: "reviewer_only";
};

export type EvidenceRejection = { key: EvidenceKey; record: string; reason: string };

export type EvidenceAttachment = {
  scope: "QA_PRIVATE";
  bound: EvidenceBinding[];
  rejected: EvidenceRejection[];
};

type Row = EngineMetricRow & {
  version?: number | null;
  source_key?: string | null;
  source_url?: string | null;
  filed_at?: string | null;
  period_start?: string | null;
  fiscal_year?: number | null;
  fiscal_quarter?: number | null;
  currency?: string | null;
  unit?: string | null;
  scope?: string | null;
  dimensions?: Record<string, unknown> | null;
  is_calculated?: number | boolean | null;
  provenance?: {
    source?: { content_hash?: string | null; filing_type?: string | null } | null;
    extraction?: { scale?: string | null } | null;
  } | null;
};

const KEY_FIELDS: (keyof EvidenceKey)[] = [
  "companyId",
  "metric",
  "periodKind",
  "periodStart",
  "periodEnd",
  "fiscalYear",
  "fiscalQuarter",
  "currency",
  "unit",
  "scale",
  "scope",
  "dimensions",
  "version",
  "sourceKey",
  "sourceContentHash",
  "sourceUrl",
  "filingType",
  "filedAt",
  "amount",
];

const HISTORY: Record<EvidenceKey["periodKind"], string> = {
  fy: "annual",
  instant: "annual_position",
  quarter: "quarter",
  ytd: "quarter",
};
const SNAPSHOT: Record<EvidenceKey["periodKind"], string> = {
  fy: "annual",
  instant: "instant",
  quarter: "quarter",
  ytd: "ytd",
};

/** ترتيب ثابت للأبعاد حتى لا يغيّر ترتيب المفاتيح نتيجة المقارنة. */
const canon = (d: Record<string, unknown> | null | undefined) =>
  JSON.stringify(Object.entries(d ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** هوية الصف المالية الكاملة كما في الحمولة، بالحقول نفسها لمفتاح الدليل. */
export function rowIdentity(
  page: EnginePage,
  metric: string,
  r: Row,
): Omit<EvidenceKey, "dimensions"> & { dimensions: string } {
  return {
    companyId: (page.company as { company_id?: string }).company_id ?? "",
    metric,
    periodKind: r.period_kind as EvidenceKey["periodKind"],
    periodStart: r.period_start || null,
    periodEnd: r.period_end ?? "",
    fiscalYear: r.fiscal_year as number,
    fiscalQuarter: r.fiscal_quarter ?? null,
    currency: r.currency ?? "",
    unit: r.unit ?? "",
    scale: r.provenance?.extraction?.scale ?? "",
    scope: r.scope ?? "",
    dimensions: canon(r.dimensions),
    version: r.version as number,
    sourceKey: r.source_key ?? "",
    sourceContentHash: r.provenance?.source?.content_hash ?? "",
    sourceUrl: r.source_url ?? "",
    filingType: r.provenance?.source?.filing_type ?? "",
    filedAt: r.filed_at ?? "",
    amount: r.value as string,
  };
}

/** كل صفوف الحمولة لهذا المقياس والفترة، من سجل الفترات ومن ملخص آخر فترة. */
export function payloadRows(page: EnginePage, key: EvidenceKey): Row[] {
  const fin = page.sections.financials as unknown as Record<string, unknown>;
  const history = (fin["history"] ?? {}) as Record<
    string,
    { periods?: { period_end: string; metrics: Record<string, Row[]> }[] }
  >;
  const fromHistory = (history[HISTORY[key.periodKind]]?.periods ?? [])
    .filter((p) => p.period_end === key.periodEnd)
    .flatMap((p) => p.metrics[key.metric] ?? []);
  const snap = fin[SNAPSHOT[key.periodKind]] as { metrics?: Record<string, Row[]> } | undefined;
  const fromSnapshot = snap?.metrics?.[key.metric] ?? [];
  return [...fromHistory, ...fromSnapshot].filter(
    (r) => r.period_end === key.periodEnd && r.period_kind === key.periodKind,
  );
}

function keyComplete(key: EvidenceKey): boolean {
  const k = key as Record<string, unknown>;
  if (Object.keys(k).length !== KEY_FIELDS.length) return false;
  return KEY_FIELDS.every((f) => {
    const v = k[f];
    if (f === "periodStart" || f === "fiscalQuarter") return v !== undefined;
    if (f === "dimensions") return !!v && typeof v === "object" && !Array.isArray(v);
    return v !== undefined && v !== null && v !== "";
  });
}

function bindOne(page: EnginePage, key: EvidenceKey): string | null {
  if (!keyComplete(key)) return "key_incomplete";
  const company = (page.company as { company_id?: string }).company_id;
  if (company !== key.companyId) return "company_mismatch";
  const rows = payloadRows(page, key);
  if (!rows.length) return "no_row_for_metric_and_period";
  if (rows.some((r) => r.is_calculated)) return "calculated_row";
  const ids = new Set(rows.map((r) => JSON.stringify(rowIdentity(page, key.metric, r))));
  if (ids.size > 1) return "payload_rows_disagree";
  const id = rowIdentity(page, key.metric, rows[0]!);
  const want = { ...key, dimensions: canon(key.dimensions) };
  // مساواة صارمة لكل حقل: لا تحويل عملة ولا وحدة ولا مقياس، ولا قبول لبداية فترة أو نطاق مختلف.
  const diff = KEY_FIELDS.filter((f) => id[f] !== want[f]);
  return diff.length ? `key_mismatch:${diff.join(",")}` : null;
}

/** فشل مغلق: إن اختلفت هوية الـfixture رُفضت كل الإدخالات؛ ولا ربط جزئي لأي مفتاح. */
export function bindEvidenceOverlay(
  page: EnginePage,
  overlay: EvidenceOverlay,
): EvidenceAttachment {
  const out: EvidenceAttachment = { scope: "QA_PRIVATE", bound: [], rejected: [] };
  const fx = overlay.fixture;
  const pageCompany = (page.company as { company_id?: string }).company_id;
  const fixtureOk =
    overlay.schema === "marefa-qa-evidence-overlay/2" &&
    overlay.scope === "QA_PRIVATE" &&
    pageCompany === fx.companyId &&
    (page as { generated_at?: string }).generated_at === fx.generatedAt &&
    page.contract_version === fx.contractVersion;
  for (const { key, evidence } of overlay.entries) {
    const reason = fixtureOk ? bindOne(page, key) : "fixture_identity_mismatch";
    if (reason) out.rejected.push({ key, record: evidence.record, reason });
    else out.bound.push({ key, evidence, qualification: "WITHHELD", display: "reviewer_only" });
  }
  return out;
}
