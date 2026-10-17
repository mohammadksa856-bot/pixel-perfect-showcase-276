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

/** هوية مستند من سجل موثوق (ليست مشتقة من URL أو content_hash). */
export type TrustedDocumentIdentity = {
  id: string;
  version: number;
  sha256: string;
  /** وقت النشر بدقة ميلي ثانية UTC. تاريخ اليوم وحده لا يُحوَّل إلى وقت (B02). */
  publishedAt: string;
};

export type BridgeResult =
  { constructible: true; claim: Claim } | { constructible: false; missing: string[] };

export function toResearchClaim(
  c: ClaimRecord,
  company: Register["company"],
  doc: TrustedDocumentIdentity | null,
  authoring: { authorId: string; createdAt: string },
): BridgeResult {
  const missing: string[] = [];
  if (!doc) missing.push("trusted_document_identity");
  if (c.quote === null) missing.push("verbatim_quote (results link to Marefa Data, not a claim)");
  const locator =
    c.evidence.page !== null || c.evidence.table !== null || c.evidence.note !== null
      ? {
          page: c.evidence.page,
          table: c.evidence.table,
          anchor: c.evidence.note ? `note ${c.evidence.note}` : null,
        }
      : null;
  if (!locator) missing.push("locator");
  if (missing.length || !doc || !locator || c.quote === null)
    return { constructible: false, missing };

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
    contentKind: "published_fact",
    temporalBasis: c.category === "management_plan" ? "issuer_guidance" : "actual",
    company: { id: company.id, market: company.market, symbol: company.symbol, sector: null },
    identity: {
      companyId: company.id,
      metric: null,
      scope: "non_financial",
      dimensions: {},
      period: {
        kind: "non_financial",
        start: null,
        end: null,
        fiscalYear: null,
        fiscalQuarter: null,
      },
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
      "Verbatim issuer statement; not a research opinion, forecast or financial approval.",
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
