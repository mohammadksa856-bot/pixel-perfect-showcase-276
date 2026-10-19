import type { EngineMetricRow, EnginePage } from "./company-preview";

/**
 * W0 (QA خاص): ربط أدلة مراجعة بقيم الحمولة الحالية دون تغيير المحرك أو الـfixture أو حالة أي خلية.
 * الربط بالمفتاح الكامل فقط (الشركة، المقياس، نوع الفترة، نهايتها، الإصدار، المصدر، المبلغ)، ولا بديل:
 * أي اختلاف أو تعارض في الحمولة يرفض الربط. لا تُعرض القيمة من هنا ولا تُرفع حالة WITHHELD.
 */
export type EvidenceKey = {
  companyId: string;
  metric: string;
  periodKind: "fy" | "instant" | "quarter" | "ytd";
  periodEnd: string;
  version: number;
  sourceKey: string;
  valueSar: string;
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
  schema: "marefa-qa-evidence-overlay/1";
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

type Row = EngineMetricRow & { version?: number | null; source_key?: string | null };

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

function bindOne(page: EnginePage, key: EvidenceKey): string | null {
  const company = (page.company as { company_id?: string }).company_id;
  if (company !== key.companyId) return "company_mismatch";
  const rows = payloadRows(page, key);
  if (!rows.length) return "no_row_for_metric_and_period";
  const ids = new Set(rows.map((r) => `${r.version}|${r.source_key}|${r.value}`));
  if (ids.size > 1) return "payload_rows_disagree";
  const r = rows[0]!;
  const diff = [
    r.version !== key.version && "version",
    r.source_key !== key.sourceKey && "source_key",
    r.value !== key.valueSar && "value",
  ].filter(Boolean);
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
    overlay.schema === "marefa-qa-evidence-overlay/1" &&
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
