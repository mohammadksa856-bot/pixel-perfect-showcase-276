/**
 * WEB-08B03 — بناء سجل الإفصاحات والأحداث والادعاءات لأرامكو من العينة المجمدة المقبولة.
 * قراءة فقط: لا يعدّل المحرك ولا القيم ولا Supabase، ولا يُستورد من التطبيق.
 * لا يخزن قيمًا مالية؛ يشير إلى سجلات المحرك ويربط بـ Marefa Data.
 * كل الادعاءات WITHHELD: الأهلية تتطلب ما يفرضه عقد WEB-08B01 (إصدار المستند وبصمته، موضع مثبت،
 * منحة حقوق موثقة، مراجعة مالية مستقلة، إجازة تحريرية) ولا يتوفر شيء من ذلك هنا.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { TOPICS } from "../v1/contract";
import {
  CLAIM_CURATION,
  CURATION_COMPANY,
  DOCUMENT_CURATION,
  EVENT_GROUPS,
  PROJECT_CURATION,
  type Category,
  type ClaimCuration,
  type EffectPeriod,
  type EventGroupCuration,
  type FieldSource,
  type GroupBasis,
  type RecordRef,
  type Topic,
} from "./curation";
import { SOURCE_REVIEW, SOURCE_REVIEW_REF, type SourceFinding } from "./source-review";

// ───────────────────────── المدخلات

type RawSource = {
  source_key: string;
  source_url: string;
  filing_type: string;
  filed_at: string;
  content_hash?: string | null;
  artifact_sha256?: string | null;
};
type RawDisclosure = {
  disclosure_type: string;
  title: string;
  body_text: string | null;
  language: string;
  published_at: string;
  period_end: string | null;
  version: number;
  source_key: string;
  source_url: string;
  metadata: Record<string, unknown>;
  provenance: { source?: RawSource };
};
type RawAction = {
  action_key: string;
  action_type: string;
  title: string;
  announcement_date: string | null;
  effective_date: string | null;
  status: string | null;
  version: number;
  source_key: string;
  source_url: string;
  details: Record<string, unknown>;
  provenance: { source?: RawSource };
};
type RawOfficialSource = {
  source_key: string;
  filing_type: string;
  filed_at: string;
  source_url: string;
  status: string;
  content_hash: string | null;
  artifact_hash: string | null;
};
export type Snapshot = {
  generatedAt: string;
  contractVersion: number;
  company: { market: string; symbol: string };
  disclosures: RawDisclosure[];
  actions: RawAction[];
  officialSources: RawOfficialSource[];
  /** مفاتيح المقاييس المنشورة في صفحة المحرك (للتحقق من روابط المشاريع فقط، دون قيم). */
  metricKeys: Set<string>;
};
export type B02Document = { key: string; url: string; published: string; sha256: string };
export type B02Evidence = { documents: B02Document[]; reviewedPages: Record<string, number[]> };

const FIXTURE = new URL("../../tests/fixtures/codex-20261013/2222-page.json.gz", import.meta.url);
const B02_REGISTER = new URL(
  "../../review-delivery/WEB08B02/FINANCIAL-EVIDENCE-REGISTER.json",
  import.meta.url,
);
const B02_LOCATORS = new URL(
  "../../review-delivery/WEB08B02/REVIEWED-LOCATORS.json",
  import.meta.url,
);

/** اللقطة المجمدة المقبولة (حزمة 2026-10-13). لا قراءة حية. */
export function loadSnapshot(): Snapshot {
  const raw = JSON.parse(gunzipSync(readFileSync(FIXTURE)).toString());
  return snapshotFrom(raw);
}
export function snapshotFrom(raw: {
  generated_at: string;
  contract_version: number;
  company: { market?: string; symbol?: string; ticker?: string };
  sections: {
    disclosures?: RawDisclosure[];
    corporate_actions?: RawAction[];
    official_sources?: RawOfficialSource[];
    financials?: unknown;
  };
}): Snapshot {
  // مفاتيح صفوف الحقائق فقط (annual/quarter/ytd/ttm/instant → metrics)، لا تعريفات الصيغ.
  const metricKeys = new Set<string>();
  const fin = (raw.sections.financials ?? {}) as Record<
    string,
    { metrics?: Record<string, unknown[]> }
  >;
  for (const bucket of ["annual", "quarter", "ytd", "ttm", "instant"])
    for (const [key, rows] of Object.entries(fin[bucket]?.metrics ?? {}))
      if (Array.isArray(rows) && rows.length) metricKeys.add(key);
  return {
    generatedAt: raw.generated_at,
    contractVersion: raw.contract_version,
    company: {
      market: String(raw.company.market ?? "SA"),
      symbol: String(raw.company.symbol ?? raw.company.ticker ?? ""),
    },
    disclosures: raw.sections.disclosures ?? [],
    actions: raw.sections.corporate_actions ?? [],
    officialSources: raw.sections.official_sources ?? [],
    metricKeys,
  };
}
export function loadB02(): B02Evidence {
  const reg = JSON.parse(readFileSync(B02_REGISTER, "utf8"));
  const loc = JSON.parse(readFileSync(B02_LOCATORS, "utf8"));
  return {
    documents: reg.documents.map((d: B02Document) => ({
      key: d.key,
      url: d.url,
      published: d.published,
      sha256: d.sha256,
    })),
    reviewedPages: loc.reviewed_pages,
  };
}

// ───────────────────────── المخرجات

export type GapCode =
  | "engine_record_id_missing"
  | "document_version_missing"
  | "original_artifact_sha256_missing"
  | "locator_missing"
  | "locator_unverified"
  | "documented_rights_grant_missing"
  | "independent_review_receipt_missing"
  | "editorial_review_missing"
  | "source_url_not_https"
  // R03: طبقة المراجعة المستقلة للأصل، منفصلة عن نص المحرك.
  | "engine_text_not_verified_against_original"
  | "independent_source_review_missing"
  | "engine_text_conflicts_with_original"
  | "locator_conflicts_with_independent_review"
  | "original_locator_not_found"
  | "derived_figure_in_engine_text"
  | "exact_date_unverified";
export type WarningCode =
  | "evidence_published_after_event"
  | "classification_override"
  | "quote_not_copied_links_marefa_data"
  | "quote_contains_disclosed_figure"
  | "engine_excerpt_withheld_conflict"
  | "same_event_multiple_records"
  | "composite_of_distinct_milestones";

/** A quantity in the verbatim text (money, percentage, scale). It stays text, never a parsed value. */
const DISCLOSED_FIGURE = /\d[\d.,]*\s*(%|billion|million)|\b(USD|SAR)\s*\d/i;

export type DocumentRecord = {
  artifactUrl: string;
  family: string;
  editions: string[];
  /** سجلات المصدر في المحرك لهذا الملف (نوع الإيداع وتاريخه وبصمة المحتوى). ليست إصدارات مستند. */
  sourceRecords: {
    sourceKey: string;
    filingType: string;
    filedAt: string;
    contentHash: string | null;
  }[];
  /** بصمة PDF الأصلي فقط إن ثبتتها B02 لنفس الرابط؛ وإلا null. لا تُشتق من content_hash. */
  pdfSha256: string | null;
  pdfSha256Origin: "WEB08B02/FINANCIAL-EVIDENCE-REGISTER" | null;
  b02Key: string | null;
  firstFiledAt: string;
  /** هل يظهر الملف في لقطة المحرك؟ ملفات B02 غير الموجودة في اللقطة تُدرج كإصدارات للسلسلة فقط. */
  inEngineSnapshot: boolean;
};

export type ClaimRecord = {
  id: string;
  companyId: string;
  eventId: string;
  eventType: ClaimCuration["eventType"];
  category: Category;
  planKind: ClaimCuration["planKind"] | null;
  topic: Topic;
  crossTopics: Topic[];
  /** مقطع حرفي من نص لقطة المحرك؛ ليس نصًا مطابقًا للمستند الأصلي. */
  quote: string | null;
  quoteOrigin: "engine_snapshot_text" | null;
  /** نص المحرك المحجوب عن الاقتباس لتعارضه مع الأصل (للتتبع فقط). */
  engineExcerpt: { text: string; conflictingFragment: string; conflict: string } | null;
  quoteField: "body_text" | "title";
  language: "en";
  record: RecordRef;
  engineType: string;
  evidence: {
    url: string;
    sourceKey: string;
    filingType: string;
    filedAt: string;
    /** صفحة سجل المحرك كما هي؛ لا تُصحَّح هنا. صفحات المراجع في sourceReview. */
    page: number | null;
    pageOrigin: "engine_record";
    note: string | null;
    table: string | null;
    pdfSha256: string | null;
  };
  effect: EffectPeriod;
  sourceReview: (SourceFinding & { reviewSha: string }) | null;
  links: { intelligence: string; marefaData: string };
  qualification: {
    status: "WITHHELD";
    publicationEligible: false;
    gaps: GapCode[];
    warnings: WarningCode[];
  };
  override: string | null;
  rationale: string;
};

/** مجموعة سجلات منسقة، لا حدث اقتصادي مستقل مثبت (economicEventVerified دائمًا false). */
export type EventRecord = {
  eventId: string;
  eventType: ClaimCuration["eventType"];
  topic: Topic;
  basis: GroupBasis;
  economicEventVerified: false;
  linked: NonNullable<EventGroupCuration["linked"]>;
  records: RecordRef[];
  claimIds: string[];
  firstEvidenceFiledAt: string;
  /** فترات الأثر المختلفة لادعاءات المجموعة، دون اختيار أولها. */
  effects: EffectPeriod[];
};

export type Register = {
  schema: "marefa-aramco-disclosure-register/1";
  company: { id: string; market: string; symbol: string };
  snapshot: { generatedAt: string; contractVersion: number; fixture: string };
  documents: DocumentRecord[];
  counting: { documents: string; events: string };
  events: EventRecord[];
  claims: ClaimRecord[];
  unclassified: { record: RecordRef; reason: string }[];
  topicMap: {
    topic: Topic;
    claims: string[];
    crossClaims: string[];
    events: string[];
    documents: string[];
    status: "has_disclosures" | "linked_only" | "no_disclosure_in_sample";
  }[];
  projects: ProjectRecord[];
  riskGuidance: {
    categories: Record<Category, string[]>;
    notes: Record<Category, string>;
  };
};

export type ProjectRecord = {
  id: string;
  name: string;
  kind: "project" | "program_target";
  description: { claimId: string; quote: string | null; withheld: string | null }[];
  capacity: FieldStatus;
  executionStatus: { state: string; claimId: string | null };
  timing: FieldStatus;
  cost: FieldStatus;
  relatedEngineMetrics: { key: string; presentInSnapshot: boolean }[];
  economicDrivers: { status: "not_authored"; reason: string };
  qualification: "WITHHELD";
};

/**
 * حالة حقل مشروع (R03): يفرّق بين «مذكور ولم يُستخرج» و«غير مذكور في سجل المحرك».
 * لا توجد حالة «غير معلن»: لا يُحكم بعدم إفصاح المُصدر دون فحص الأصل.
 */
export type FieldStatus =
  | { status: "stated_in_engine_quote_not_extracted"; claimId: string }
  | {
      status: "in_original_per_independent_review_not_extracted";
      pdfPages: number[];
      reviewSha: string;
    }
  | { status: "not_in_engine_record_original_unchecked" };

/** تاريخ تقويمي صالح YYYY-MM-DD (يرفض 2025-02-30). */
export const isCivilDate = (d: unknown): d is string => {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const x = new Date(`${d}T00:00:00.000Z`);
  return !Number.isNaN(x.getTime()) && x.toISOString().slice(0, 10) === d;
};
const isYear = (y: unknown): y is number =>
  Number.isInteger(y) && (y as number) >= 1900 && (y as number) <= 2100;
function validateEffect(id: string, e: EffectPeriod) {
  const bad = (why: string) => {
    throw Error(`invalid_effect_period:${id}:${why}`);
  };
  switch (e.kind) {
    case "fiscal_year":
      if (!isYear(e.fiscalYear)) bad("fiscal_year");
      break;
    case "as_of":
    case "event_date":
      if (!isCivilDate(e.date)) bad(`date:${String(e.date)}`);
      break;
    case "reporting_period":
      if (!isCivilDate(e.start) || !isCivilDate(e.end) || e.start > e.end) bad("reporting_period");
      break;
    case "through_year":
      if (
        !isYear(e.targetYear) ||
        (e.baseYear !== null && (!isYear(e.baseYear) || e.baseYear >= e.targetYear))
      )
        bad("through_year");
      break;
    case "term":
      if (
        (e.years === null && e.months === null) ||
        (e.years !== null && !(Number.isInteger(e.years) && e.years > 0)) ||
        (e.months !== null && !(Number.isInteger(e.months) && e.months > 0)) ||
        e.start !== null
      )
        bad("term");
      break;
    case "not_stated_in_record":
      break;
    default:
      bad("unknown_kind");
  }
}

/** مجموعات Company Intelligence / Marefa Data لكل موضوع (من model.ts، دون استيراد التطبيق). */
const GROUP_OF_TOPIC: Record<Topic, string> = {
  identity: "business",
  business: "business",
  industry: "business",
  competitors: "business",
  financials: "financials",
  earnings_quality: "financials",
  ratios: "financials",
  operations: "financials",
  ownership: "shareholders",
  dividends_actions: "shareholders",
  governance: "shareholders",
  trading: "market",
  valuation: "market",
  forecasts: "market",
  analysts: "market",
  risks: "risks",
  esg: "risks",
  news: "risks",
};
export const groupOfTopic = (t: Topic) => GROUP_OF_TOPIC[t];

const recordLabel = (r: RecordRef) =>
  r.section === "disclosures"
    ? `disclosures|${r.type}|${r.title}|${r.publishedAt}|v${r.version}`
    : `corporate_actions|${r.actionKey}|v${r.version}`;

function findRecord(s: Snapshot, r: RecordRef) {
  if (r.section === "disclosures") {
    const m = s.disclosures.filter(
      (d) =>
        d.disclosure_type === r.type &&
        d.title === r.title &&
        d.published_at === r.publishedAt &&
        d.version === r.version,
    );
    if (m.length !== 1) throw Error(`record_not_unique_or_missing:${recordLabel(r)}:${m.length}`);
    return { kind: "disclosure" as const, d: m[0]! };
  }
  const m = s.actions.filter((a) => a.action_key === r.actionKey && a.version === r.version);
  if (m.length !== 1) throw Error(`record_not_unique_or_missing:${recordLabel(r)}:${m.length}`);
  return { kind: "action" as const, a: m[0]! };
}

const isHttps = (u: string) => {
  try {
    const x = new URL(u);
    return x.protocol === "https:" && !x.username && !x.password;
  } catch {
    return false;
  }
};

export function buildRegister(
  s: Snapshot,
  b02: B02Evidence,
  claimCuration = CLAIM_CURATION,
  documentCuration = DOCUMENT_CURATION,
  projectCuration = PROJECT_CURATION,
  eventGroups: Record<string, EventGroupCuration> = EVENT_GROUPS,
  sourceReview: Record<string, SourceFinding> = SOURCE_REVIEW,
): Register {
  const companyId = `${s.company.market}:${s.company.symbol}`;
  // R04: قرارات التنسيق تخص أرامكو؛ لا تُورَّث لشركة أخرى.
  if (s.company.market !== CURATION_COMPANY.market || s.company.symbol !== CURATION_COMPANY.symbol)
    throw Error(`curation_company_mismatch:${companyId}`);
  // R01: بصمتان مختلفتان لنفس الرابط أو المفتاح في B02 = هوية ملتبسة؛ يُرفض بدل اختيار الأول.
  for (const d of b02.documents) {
    if (!/^[0-9a-f]{64}$/.test(d.sha256)) throw Error(`b02_invalid_sha256:${d.url}`);
    for (const o of b02.documents)
      if ((o.url === d.url || o.key === d.key) && (o.sha256 !== d.sha256 || o.url !== d.url))
        throw Error(`b02_conflicting_artifact_identity:${d.key}:${d.url}`);
  }
  const pdfOf = (url: string) => b02.documents.find((d) => d.url === url) ?? null;
  // R04: تواريخ تقويمية صالحة في القرارات المنسقة والمراجع.
  const seenIds = new Set<string>();
  for (const entry of claimCuration) {
    if (entry.record.section === "disclosures" && !isCivilDate(entry.record.publishedAt))
      throw Error(`invalid_record_date:${entry.record.title}`);
    for (const c of entry.claims) {
      if (seenIds.has(c.id)) throw Error(`duplicate_claim_id:${c.id}`);
      seenIds.add(c.id);
      validateEffect(c.id, c.effect);
    }
  }

  // الوثائق: كل ملف أصلي مرة واحدة، مع كل سجلات المصدر التي تشير إليه.
  const byUrl = new Map<string, DocumentRecord>();
  const addSource = (
    src: RawSource | RawOfficialSource,
    family: string,
    edition: string | null,
  ) => {
    const cur =
      byUrl.get(src.source_url) ??
      ({
        artifactUrl: src.source_url,
        family,
        editions: [],
        sourceRecords: [],
        pdfSha256: pdfOf(src.source_url)?.sha256 ?? null,
        pdfSha256Origin: pdfOf(src.source_url) ? "WEB08B02/FINANCIAL-EVIDENCE-REGISTER" : null,
        b02Key: pdfOf(src.source_url)?.key ?? null,
        firstFiledAt: src.filed_at,
        inEngineSnapshot: true,
      } satisfies DocumentRecord);
    if (edition && !cur.editions.includes(edition)) cur.editions.push(edition);
    if (
      !cur.sourceRecords.some(
        (r) => r.sourceKey === src.source_key && r.filingType === src.filing_type,
      )
    )
      cur.sourceRecords.push({
        sourceKey: src.source_key,
        filingType: src.filing_type,
        filedAt: src.filed_at,
        contentHash: src.content_hash ?? null,
      });
    if (src.filed_at < cur.firstFiledAt) cur.firstFiledAt = src.filed_at;
    byUrl.set(src.source_url, cur);
  };
  const familyOf = (url: string) =>
    /interim-report/.test(url)
      ? "interim_report"
      : /full-financials/.test(url)
        ? "financial_statements"
        : /saudi-aramco-ara-/.test(url)
          ? "annual_report"
          : /saudiexchange/.test(url)
            ? "exchange_data"
            : "other";
  for (const o of s.officialSources) addSource(o, familyOf(o.source_url), null);
  for (const dc of documentCuration) {
    const r = findRecord(s, dc.record);
    if (r.kind !== "disclosure") continue;
    addSource(
      r.d.provenance.source ?? {
        ...r.d,
        filing_type: r.d.disclosure_type,
        filed_at: r.d.published_at,
      },
      dc.family,
      dc.edition,
    );
  }

  // الادعاءات
  const claims: ClaimRecord[] = [];
  const seenRecords = new Set<string>();
  for (const entry of claimCuration) {
    const r = findRecord(s, entry.record);
    seenRecords.add(recordLabel(entry.record));
    const src: RawSource =
      (r.kind === "disclosure" ? r.d.provenance.source : r.a.provenance.source) ??
      (r.kind === "disclosure"
        ? {
            source_key: r.d.source_key,
            source_url: r.d.source_url,
            filing_type: r.d.disclosure_type,
            filed_at: r.d.published_at,
          }
        : {
            source_key: r.a.source_key,
            source_url: r.a.source_url,
            filing_type: r.a.action_type,
            filed_at: r.a.announcement_date ?? "",
          });
    addSource(src, familyOf(src.source_url), null);
    const text =
      r.kind === "disclosure"
        ? entry.claims[0]?.quoteField === "title"
          ? r.d.title
          : (r.d.body_text ?? "")
        : r.a.title;
    const meta = r.kind === "disclosure" ? r.d.metadata : r.a.details;
    const page =
      typeof meta["page"] === "number"
        ? (meta["page"] as number)
        : typeof meta["source_page"] === "number"
          ? (meta["source_page"] as number)
          : null;
    const doc = pdfOf(src.source_url);
    for (const c of entry.claims) {
      const fieldText =
        c.quoteField === "title" ? (r.kind === "disclosure" ? r.d.title : r.a.title) : text;
      if (c.quote !== null && !fieldText.includes(c.quote))
        throw Error(`quote_not_verbatim:${c.id}`);
      // R03: نص محرك يخالف الأصل لا يُقتبس؛ يبقى حرفيًا للتتبع فقط.
      if (c.engineTextConflict || c.engineExcerpt || c.conflictingFragment) {
        if (
          !c.engineTextConflict ||
          !c.engineExcerpt ||
          !c.conflictingFragment ||
          !c.engineExcerpt.includes(c.conflictingFragment) ||
          (c.quote !== null &&
            (!c.engineExcerpt.includes(c.quote) || c.quote.includes(c.conflictingFragment)))
        )
          throw Error(`engine_conflict_curation_invalid:${c.id}`);
        if (!fieldText.includes(c.engineExcerpt)) throw Error(`quote_not_verbatim:${c.id}`);
      }
      const review = sourceReview[c.id] ?? null;
      if (review?.meaningConflict && !c.engineTextConflict)
        throw Error(`source_conflict_not_handled:${c.id}`);
      const gaps: GapCode[] = [];
      if (r.kind === "disclosure") gaps.push("engine_record_id_missing");
      gaps.push("document_version_missing");
      if (!doc) gaps.push("original_artifact_sha256_missing");
      if (page === null) gaps.push("locator_missing");
      else if (!(doc && b02.reviewedPages[doc.key]?.includes(page)))
        gaps.push("locator_unverified");
      gaps.push(
        "documented_rights_grant_missing",
        "independent_review_receipt_missing",
        "editorial_review_missing",
      );
      if (!isHttps(src.source_url)) gaps.push("source_url_not_https");
      gaps.push("engine_text_not_verified_against_original");
      if (!review) gaps.push("independent_source_review_missing");
      else {
        if (review.meaningConflict) gaps.push("engine_text_conflicts_with_original");
        if (review.locator === "conflict") gaps.push("locator_conflicts_with_independent_review");
        if (review.locator === "not_located") gaps.push("original_locator_not_found");
        if (review.derivationInEngineText) gaps.push("derived_figure_in_engine_text");
        if (review.exactDateUnverified) gaps.push("exact_date_unverified");
      }
      const warnings: WarningCode[] = [];
      const eventDate = c.effect.kind === "event_date" ? c.effect.date : null;
      if (eventDate && src.filed_at.slice(0, 10) > eventDate)
        warnings.push("evidence_published_after_event");
      if (c.override) warnings.push("classification_override");
      if (c.engineTextConflict) warnings.push("engine_excerpt_withheld_conflict");
      else if (c.quote === null) warnings.push("quote_not_copied_links_marefa_data");
      else if (DISCLOSED_FIGURE.test(c.quote)) warnings.push("quote_contains_disclosed_figure");
      const group = groupOfTopic(c.topic);
      claims.push({
        id: c.id,
        companyId,
        eventId: c.eventId,
        eventType: c.eventType,
        category: c.category,
        planKind: c.planKind ?? null,
        topic: c.topic,
        crossTopics: c.crossTopics,
        quote: c.quote,
        quoteOrigin: c.quote === null ? null : "engine_snapshot_text",
        engineExcerpt:
          c.engineExcerpt && c.engineTextConflict && c.conflictingFragment
            ? {
                text: c.engineExcerpt,
                conflictingFragment: c.conflictingFragment,
                conflict: c.engineTextConflict,
              }
            : null,
        quoteField: c.quoteField,
        language: "en",
        record: entry.record,
        engineType: r.kind === "disclosure" ? r.d.disclosure_type : r.a.action_type,
        evidence: {
          url: src.source_url,
          sourceKey: src.source_key,
          filingType: src.filing_type,
          filedAt: src.filed_at,
          page,
          pageOrigin: "engine_record",
          note: typeof meta["note"] === "string" ? (meta["note"] as string) : null,
          table: typeof meta["table_ref"] === "string" ? (meta["table_ref"] as string) : null,
          pdfSha256: doc?.sha256 ?? null,
        },
        effect: c.effect,
        sourceReview: review ? { ...review, reviewSha: SOURCE_REVIEW_REF.sha } : null,
        links: {
          intelligence: `/preview/web-v1/companies/${s.company.symbol}/intelligence?topic=${c.topic}`,
          marefaData: `/preview/web-v1/companies/${s.company.symbol}?tab=${c.marefaDataTab ?? group}`,
        },
        qualification: { status: "WITHHELD", publicationEligible: false, gaps, warnings },
        override: c.override ?? null,
        rationale: c.rationale,
      });
    }
  }

  // مجموعات الأحداث (R04): سجلات منسقة، لا أحداث اقتصادية مثبتة. الدمج تحت eventId واحد يتطلب
  // قرار مجموعة معلنًا ونوعًا وموضوعًا متطابقين؛ أي تعارض يُرفض بدل اختيار أول ادعاء.
  const events = new Map<string, EventRecord>();
  for (const c of claims) {
    const g = eventGroups[c.eventId];
    if (!g) throw Error(`event_group_uncurated:${c.eventId}`);
    const e =
      events.get(c.eventId) ??
      ({
        eventId: c.eventId,
        eventType: c.eventType,
        topic: c.topic,
        basis: g.basis,
        economicEventVerified: false,
        linked: g.linked ?? [],
        records: [],
        claimIds: [],
        firstEvidenceFiledAt: c.evidence.filedAt,
        effects: [],
      } satisfies EventRecord);
    if (e.eventType !== c.eventType || e.topic !== c.topic)
      throw Error(`event_group_incompatible:${c.eventId}:${e.eventType}/${c.eventType}`);
    const prevDate = e.effects.find((x) => x.kind === "event_date");
    if (
      c.effect.kind === "event_date" &&
      prevDate?.kind === "event_date" &&
      prevDate.date !== c.effect.date
    )
      throw Error(`event_group_date_conflict:${c.eventId}`);
    if (!e.records.some((x) => recordLabel(x) === recordLabel(c.record))) e.records.push(c.record);
    e.claimIds.push(c.id);
    if (!e.effects.some((x) => JSON.stringify(x) === JSON.stringify(c.effect)))
      e.effects.push(c.effect);
    if (c.evidence.filedAt < e.firstEvidenceFiledAt) e.firstEvidenceFiledAt = c.evidence.filedAt;
    events.set(c.eventId, e);
  }
  for (const e of events.values()) {
    const n = e.records.length;
    const ok =
      e.basis === "single_record"
        ? n === 1 && e.claimIds.length === 1
        : e.basis === "one_event_two_records"
          ? n === 2
          : e.basis === "composite_of_distinct_milestones"
            ? n === 1 && e.claimIds.length === 1
            : n === 1 && e.claimIds.length >= 2;
    if (!ok) throw Error(`event_group_basis_mismatch:${e.eventId}:${e.basis}`);
    for (const x of e.linked)
      if (!eventGroups[x.eventId]?.linked?.some((y) => y.eventId === e.eventId))
        throw Error(`event_group_link_not_reciprocal:${e.eventId}:${x.eventId}`);
  }
  for (const c of claims) {
    const basis = events.get(c.eventId)!.basis;
    if (basis === "one_event_two_records")
      c.qualification.warnings.push("same_event_multiple_records");
    if (basis === "composite_of_distinct_milestones")
      c.qualification.warnings.push("composite_of_distinct_milestones");
  }

  // سجلات لم تُصنّف: لا تُربط بصمت بموضوع.
  for (const dc of documentCuration) seenRecords.add(recordLabel(dc.record));
  const unclassified: Register["unclassified"] = [];
  for (const d of s.disclosures) {
    const ref: RecordRef = {
      section: "disclosures",
      type: d.disclosure_type,
      title: d.title,
      publishedAt: d.published_at,
      version: d.version,
    };
    if (!seenRecords.has(recordLabel(ref)))
      unclassified.push({ record: ref, reason: "no_curation_decision" });
  }
  for (const a of s.actions) {
    const ref: RecordRef = {
      section: "corporate_actions",
      actionKey: a.action_key,
      version: a.version,
    };
    if (!seenRecords.has(recordLabel(ref)))
      unclassified.push({ record: ref, reason: "no_curation_decision" });
  }

  // ملفات B02 المثبتة التي لا تظهر في اللقطة: إصدارات أخرى من سلسلة القوائم (لا سجلات مصدر في المحرك).
  for (const d of b02.documents)
    if (!byUrl.has(d.url))
      byUrl.set(d.url, {
        artifactUrl: d.url,
        family: familyOf(d.url),
        editions: [d.key],
        sourceRecords: [],
        pdfSha256: d.sha256,
        pdfSha256Origin: "WEB08B02/FINANCIAL-EVIDENCE-REGISTER",
        b02Key: d.key,
        firstFiledAt: d.published,
        inEngineSnapshot: false,
      });
  const documents = [...byUrl.values()].sort(
    (a, b) =>
      b.firstFiledAt.localeCompare(a.firstFiledAt) || a.artifactUrl.localeCompare(b.artifactUrl),
  );
  const eventList = [...events.values()].sort(
    (a, b) =>
      b.firstEvidenceFiledAt.localeCompare(a.firstEvidenceFiledAt) ||
      a.eventId.localeCompare(b.eventId),
  );

  const topicMap = (TOPICS as readonly Topic[]).map((topic) => {
    const primary = claims.filter((c) => c.topic === topic).map((c) => c.id);
    const cross = claims.filter((c) => c.crossTopics.includes(topic)).map((c) => c.id);
    const evs = eventList.filter((e) => e.topic === topic).map((e) => e.eventId);
    const docs =
      topic === "news"
        ? documents.filter((d) => d.family !== "exchange_data").map((d) => d.artifactUrl)
        : [];
    return {
      topic,
      claims: primary,
      crossClaims: cross,
      events: evs,
      documents: docs,
      status:
        primary.length || docs.length
          ? ("has_disclosures" as const)
          : cross.length
            ? ("linked_only" as const)
            : ("no_disclosure_in_sample" as const),
    };
  });

  const claimById = new Map(claims.map((c) => [c.id, c]));
  const fieldStatus = (projectId: string, f: FieldSource): FieldStatus => {
    if (f.from === "not_in_engine_record")
      return { status: "not_in_engine_record_original_unchecked" };
    if (f.from === "original_per_review") {
      if (!f.pdfPages.length) throw Error(`project_field_review_pages_missing:${projectId}`);
      return {
        status: "in_original_per_independent_review_not_extracted",
        pdfPages: f.pdfPages,
        reviewSha: SOURCE_REVIEW_REF.sha,
      };
    }
    const c = claimById.get(f.claimId);
    if (!c || c.quote === null || !DISCLOSED_FIGURE.test(c.quote))
      throw Error(`project_field_claim_invalid:${projectId}:${f.claimId}`);
    return { status: "stated_in_engine_quote_not_extracted", claimId: c.id };
  };
  const projects: ProjectRecord[] = projectCuration.map((p) => {
    const desc = p.claimIds.map((id) => {
      const c = claimById.get(id);
      if (!c) throw Error(`project_claim_missing:${p.id}:${id}`);
      if (c.quote === null && !c.engineExcerpt) throw Error(`project_claim_missing:${p.id}:${id}`);
      return {
        claimId: id,
        quote: c.quote,
        withheld: c.engineExcerpt ? "conflicting_part_of_engine_text_withheld" : null,
      };
    });
    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      description: desc,
      capacity: fieldStatus(p.id, p.capacity),
      executionStatus:
        p.executionStatus.state === "not_stated_in_record"
          ? { state: "not_stated_in_record", claimId: null }
          : { state: p.executionStatus.state, claimId: p.executionStatus.claimId },
      timing: fieldStatus(p.id, p.timing),
      cost: fieldStatus(p.id, p.cost),
      relatedEngineMetrics: p.relatedEngineMetrics.map((key) => ({
        key,
        presentInSnapshot: s.metricKeys.has(key),
      })),
      economicDrivers: {
        status: "not_authored",
        reason:
          "لا منهجية معتمدة لربط المشروع بأثر اقتصادي؛ أي ربط تفسيري رأي بحثي يحتاج تأليفًا ومراجعة مالية وتحريرية.",
      },
      qualification: "WITHHELD",
    };
  });

  const categories: Record<Category, string[]> = {
    official_fact: [],
    management_plan: [],
    assumption: [],
    research_opinion: [],
  };
  for (const c of claims)
    if (
      c.topic === "risks" ||
      c.topic === "forecasts" ||
      c.category !== "official_fact" ||
      c.crossTopics.includes("risks")
    )
      categories[c.category].push(c.id);

  return {
    schema: "marefa-aramco-disclosure-register/1",
    company: { id: companyId, market: s.company.market, symbol: s.company.symbol },
    snapshot: {
      generatedAt: s.generatedAt,
      contractVersion: s.contractVersion,
      fixture: "tests/fixtures/codex-20261013/2222-page.json.gz",
    },
    documents,
    counting: {
      documents:
        "Document rows: report/edition files plus one exchange historical-report catalogue page; not all are pinned PDFs.",
      events:
        "Event rows are curated record groups (see basis), not independently verified unique economic events.",
    },
    events: eventList,
    claims,
    unclassified,
    topicMap,
    projects,
    riskGuidance: {
      categories,
      notes: {
        official_fact: "وقائع منشورة من المُصدر (مخاطر، التزامات، ترتيبات قائمة).",
        management_plan:
          "توجيهات وأهداف وتوقعات إدارة؛ مستقبلية بطبيعتها، لا تُعرض كوقائع ولا تُقارن بنتائج.",
        assumption: "لا افتراضات في هذه الدفعة. أي افتراض يُوسم assumption ولا يُعاد تصنيفه حقيقة.",
        research_opinion:
          "لا رأي بحثي معتمد في هذه الدفعة. أي رأي يحتاج مؤلفًا ومراجعة مالية وتحريرية وفق عقد WEB-08B01.",
      },
    },
  };
}
