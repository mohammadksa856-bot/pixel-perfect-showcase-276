/**
 * WEB-08B03 — جسر سجل الإفصاحات إلى عقد WEB-08B01 (`research-claim/1`).
 *
 * يحاول بناء ادعاء صالح للعقد من سجل الإفصاح، ويرفض حين تنقص هوية المستند (المعرف والإصدار وبصمة الأصل)
 * أو الموضع أو الاقتباس. لا يولّد معرفات من الروابط ولا يخترع إصدارات أو بصمات: هوية المستند تُمرَّر من
 * سجل مستندات موثوق فقط. في هذه الدفعة لا يوجد سجل كهذا، فكل ادعاءات أرامكو الحقيقية غير قابلة للبناء.
 * حتى الادعاء القابل للبناء يبقى محجوبًا عند التقييم دون منحة حقوق ومراجعات (يثبته الاختبار الاصطناعي).
 */
import { ClaimSchema, type Claim } from "../v1/contract";
import type { ClaimRecord, Register } from "./register";

/**
 * هوية مستند من محلّل موثوق (ليست مشتقة من URL أو content_hash). url وcompanyId اختياريان؛
 * إن وُجدا يجب أن يطابقا الادعاء. لا يوجد في هذه الدفعة محلّل كهذا، فلا تُصنع هويات هنا.
 */
export type TrustedDocumentIdentity = {
  id: string;
  version: number;
  sha256: string;
  /** وقت النشر بدقة ميلي ثانية UTC. تاريخ اليوم وحده لا يُحوَّل إلى وقت (B02). */
  publishedAt: string;
  url?: string;
  companyId?: string;
};

export type BridgeResult =
  { constructible: true; claim: Claim } | { constructible: false; missing: string[] };

const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * R01: تعارضات الهوية والإسناد. كل تعارض يرفض البناء؛ لا يُختار أحد الطرفين.
 * - بصمة المحلّل ≠ بصمة B02 المثبتة لنفس الرابط.
 * - وقت نشر أقدم من تاريخ الإيداع المسجل (لا تأريخ رجعي للمعرفة دون إثبات).
 * - رابط أو شركة المحلّل ≠ الادعاء؛ شركة السجل ≠ شركة الادعاء.
 * - معرف المستند رابط (معرفات من الروابط ممنوعة) أو إصدار غير صحيح.
 */
function bindingConflicts(
  c: ClaimRecord,
  company: Register["company"],
  doc: TrustedDocumentIdentity,
): string[] {
  const out: string[] = [];
  if (company.id !== `${company.market}:${company.symbol}` || c.companyId !== company.id)
    out.push("company_identity_mismatch");
  if (doc.companyId !== undefined && doc.companyId !== company.id)
    out.push("document_company_mismatch");
  if (doc.url !== undefined && doc.url !== c.evidence.url) out.push("document_url_mismatch");
  if (/^[a-z]+:\/\//i.test(doc.id) || doc.id.includes(c.evidence.url))
    out.push("document_id_derived_from_url");
  if (!Number.isInteger(doc.version) || doc.version < 1) out.push("document_version_invalid");
  if (!/^[0-9a-f]{64}$/.test(doc.sha256)) out.push("document_sha256_invalid");
  if (c.evidence.pdfSha256 !== null && doc.sha256 !== c.evidence.pdfSha256)
    out.push("document_sha256_conflicts_with_pinned");
  if (!ISO_MS.test(doc.publishedAt) || Number.isNaN(Date.parse(doc.publishedAt)))
    out.push("document_published_at_invalid");
  else if (doc.publishedAt.slice(0, 10) < c.evidence.filedAt.slice(0, 10))
    out.push("document_published_at_earlier_than_recorded_filing");
  return out;
}

/**
 * R02: الدلالة. الجسر ينقل مقاطع المُصدر فقط:
 * - official_fact → published_fact / actual.
 * - management_plan → published_fact / issuer_guidance (بيان منشور عن المستقبل، لا نتيجة).
 * - assumption وresearch_opinion محتوى مؤلَّف يحتاج مسارًا آخر؛ يُرفضان صراحةً ولا يتحولان إلى حقيقة.
 */
function semantics(
  c: ClaimRecord,
): { contentKind: "published_fact"; temporalBasis: "actual" | "issuer_guidance" } | null {
  if (c.category === "official_fact")
    return { contentKind: "published_fact", temporalBasis: "actual" };
  if (c.category === "management_plan")
    return { contentKind: "published_fact", temporalBasis: "issuer_guidance" };
  return null;
}

/**
 * R02: فترة الأثر. السنة المالية المثبتة تُحفظ في fiscalYear دون اختراع بداية ونهاية فترة تقرير؛
 * بقية الأنواع تبقى non_financial وتُوصف في limitations كما وردت، دون فترة مختلقة.
 */
function periodOf(c: ClaimRecord) {
  const e = c.effect;
  const period = {
    kind: "non_financial" as const,
    start: null,
    end: null,
    fiscalYear: e.kind === "fiscal_year" ? e.fiscalYear : null,
    fiscalQuarter: null,
  };
  const label =
    e.kind === "fiscal_year"
      ? `fiscal year ${e.fiscalYear}`
      : e.kind === "as_of"
        ? `as of ${e.date}`
        : e.kind === "reporting_period"
          ? `within reporting period ${e.start}..${e.end} (exact date not stated)`
          : e.kind === "through_year"
            ? `management target year ${e.targetYear}${e.baseYear ? ` versus ${e.baseYear}` : ""}`
            : e.kind === "term"
              ? `term ${e.years ? `${e.years} years` : `${e.months} months`}, start not stated`
              : e.kind === "event_date"
                ? `event date ${e.date} (engine record)`
                : "effect period not stated in the record";
  return { period, limitation: `Effect: ${label}; no reporting period is inferred.` };
}

export function toResearchClaim(
  c: ClaimRecord,
  company: Register["company"],
  doc: TrustedDocumentIdentity | null,
  authoring: { authorId: string; createdAt: string },
): BridgeResult {
  const missing: string[] = [];
  if (!doc) missing.push("trusted_document_identity");
  if (c.quote === null)
    missing.push(
      c.engineExcerpt
        ? "verbatim_quote (engine text conflicts with the original source)"
        : "verbatim_quote (results link to Marefa Data, not a claim)",
    );
  const sem = semantics(c);
  if (!sem) missing.push(`unsupported_category:${c.category}`);
  const review = c.sourceReview;
  if (review?.meaningConflict) missing.push("source_review:engine_text_conflicts_with_original");
  if (review?.locator === "conflict") missing.push("source_review:locator_conflict");
  if (review?.derivationInEngineText) missing.push("source_review:derived_figure_in_engine_text");
  const locator =
    c.evidence.page !== null || c.evidence.table !== null || c.evidence.note !== null
      ? {
          page: c.evidence.page,
          table: c.evidence.table,
          anchor: c.evidence.note ? `note ${c.evidence.note}` : null,
        }
      : null;
  if (!locator) missing.push("locator");
  if (doc) missing.push(...bindingConflicts(c, company, doc));
  if (
    sem?.temporalBasis === "actual" &&
    doc &&
    c.effect.kind === "fiscal_year" &&
    c.effect.fiscalYear > Number(doc.publishedAt.slice(0, 4))
  )
    missing.push("future_period_as_actual");
  if (missing.length || !doc || !locator || c.quote === null || !sem)
    return { constructible: false, missing };

  const { period, limitation } = periodOf(c);
  const evidence = {
    document: { id: doc.id, version: doc.version, sha256: doc.sha256 },
    url: c.evidence.url,
    publishedAt: doc.publishedAt,
    locator,
  };
  const parsed = ClaimSchema.safeParse({
    schema: "research-claim/1",
    claimId: c.id,
    revision: 1,
    topic: c.topic,
    contentKind: sem.contentKind,
    temporalBasis: sem.temporalBasis,
    company: { id: company.id, market: company.market, symbol: company.symbol, sector: null },
    identity: {
      companyId: company.id,
      metric: null,
      scope: "non_financial",
      dimensions: {},
      period,
      unit: null,
      currency: null,
    },
    body: { language: c.language, text: c.quote },
    authorId: authoring.authorId,
    createdAt: authoring.createdAt,
    informationPublishedAt: doc.publishedAt,
    validFrom: authoring.createdAt,
    validUntil: null,
    supersedes: null,
    limitations: [
      "Excerpt of the engine snapshot text; not verified verbatim against the original document, not a research opinion, forecast or financial approval.",
      limitation,
      ...(c.category === "management_plan"
        ? ["Management plan/guidance: forward-looking, not an actual result."]
        : []),
    ],
    sources: [evidence],
    bindings: [],
    calculation: null,
    rights: { declared: "unknown", grantRefs: [] },
  });
  if (!parsed.success)
    return {
      constructible: false,
      missing: parsed.error.issues.map((i) => `contract:${i.message}`),
    };
  return { constructible: true, claim: parsed.data };
}

/** محاولة البناء لكل ادعاءات السجل بلا هوية مستند (الوضع الحقيقي في هذه الدفعة). */
export function bridgeAll(r: Register) {
  return r.claims.map((c) => ({
    id: c.id,
    result: toResearchClaim(c, r.company, null, {
      authorId: "unassigned",
      createdAt: "2026-10-17T00:00:00.000Z",
    }),
  }));
}
