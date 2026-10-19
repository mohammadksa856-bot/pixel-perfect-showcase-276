// خادم فقط. W0 (QA خاص): مسار أدلة المراجع منفصل عن صفحات الشركة وحمولتها العامة.
// الترتيب: تفعيل QA → مصادقة → تفويض المراجع → عندها فقط يُقرأ ملف الأدلة ويُربط. أي فشل يمنع القراءة.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { designReviewFixturesEnabled } from "../web-v1/design-review-policy";
import type { EnginePage } from "./company-preview";
import {
  bindEvidenceOverlay,
  type EvidenceAttachment,
  type EvidenceOverlay,
} from "./evidence-overlay";

type Env = Record<string, string | undefined>;

export type Reviewer = { userId: string; isAdmin: boolean };
/** يتحقق من رمز الجلسة على الخادم ويعيد هوية المستخدم ودوره، أو null إن كان الرمز غير صالح. */
export type VerifyToken = (token: string, env: Env) => Promise<Reviewer | null>;

export type QaEvidenceResponse =
  | { status: 404; body: { error: "not_found" } }
  | { status: 401; body: { error: "unauthenticated" } }
  | { status: 403; body: { error: "forbidden" } }
  | {
      status: 200;
      body: { scope: "QA_PRIVATE"; bound: ReviewerBound[]; rejected: ReviewerRejected[] };
    };

/** ما يتلقاه المراجع: هوية المفتاح والمستند والصفحة والحالة، دون المبلغ. */
type ReviewerBound = {
  record: string;
  metric: string;
  periodKind: string;
  periodStart: string | null;
  periodEnd: string;
  version: number;
  document: string;
  sha256: string;
  pdfPage: number;
  qualification: "WITHHELD";
};
type ReviewerRejected = { record: string; reason: string };

/** يُفعَّل المسار فقط في معاينة QA المجمّدة ومع ملف أدلة وقائمة مراجعين صريحين؛ وإلا 404. */
export function qaEvidenceEnabled(env: Env): boolean {
  return (
    designReviewFixturesEnabled(env) &&
    env["MAREFA_QA_REVIEWER_ACCESS"] === "true" &&
    !!env["MAREFA_QA_EVIDENCE_OVERLAY_PATH"] &&
    reviewerIds(env).size > 0
  );
}

const reviewerIds = (env: Env) =>
  new Set(
    (env["MAREFA_QA_REVIEWER_USER_IDS"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

function bearer(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const t = authorization.slice(7).trim();
  return t.split(".").length === 3 ? t : null;
}

const redact = (a: EvidenceAttachment) => ({
  scope: a.scope,
  bound: a.bound.map((b) => ({
    record: b.evidence.record,
    metric: b.key.metric,
    periodKind: b.key.periodKind,
    periodStart: b.key.periodStart,
    periodEnd: b.key.periodEnd,
    version: b.key.version,
    document: b.evidence.document,
    sha256: b.evidence.sha256,
    pdfPage: b.evidence.pdfPage,
    qualification: b.qualification,
  })),
  rejected: a.rejected.map((r) => ({ record: r.record, reason: r.reason })),
});

export async function qaEvidenceAccess(
  req: { authorization: string | null; symbol: string },
  env: Env,
  deps: {
    verify: VerifyToken;
    page: (symbol: string) => EnginePage | undefined;
    readOverlay?: (path: string) => string;
  },
): Promise<QaEvidenceResponse> {
  if (!qaEvidenceEnabled(env)) return { status: 404, body: { error: "not_found" } };
  const token = bearer(req.authorization);
  if (!token) return { status: 401, body: { error: "unauthenticated" } };
  const who = await deps.verify(token, env).catch(() => null);
  if (!who) return { status: 401, body: { error: "unauthenticated" } };
  // تفويض المراجع: دور admin من user_roles على الخادم، وضمن قائمة المراجعين الصريحة معًا.
  if (!who.isAdmin || !reviewerIds(env).has(who.userId))
    return { status: 403, body: { error: "forbidden" } };
  const page = deps.page(req.symbol);
  if (!page) return { status: 404, body: { error: "not_found" } };
  const read = deps.readOverlay ?? ((p: string) => readFileSync(p, "utf8"));
  const overlay = JSON.parse(read(env["MAREFA_QA_EVIDENCE_OVERLAY_PATH"]!)) as EvidenceOverlay;
  return { status: 200, body: redact(bindEvidenceOverlay(structuredClone(page), overlay)) };
}

/** التحقق الفعلي: توقيع الرمز عبر Supabase ثم الدور من user_roles بالرمز نفسه (RLS). */
export const verifySupabaseToken: VerifyToken = async (token, env) => {
  const url = env["SUPABASE_URL"];
  const key = env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) return null;
  return { userId, isAdmin: isAdmin === true };
};

/** استجابة HTTP لمسار المراجع. لا تخزين مؤقت ولا فهرسة؛ الجسم خالٍ من بيانات الأدلة عند 401/403/404. */
export async function qaEvidenceHttp(
  request: Request,
  symbol: string,
  env: Env = process.env,
  verify: VerifyToken = verifySupabaseToken,
): Promise<Response> {
  const { default: pages } = await import("virtual:marefa-design-fixtures");
  const r = await qaEvidenceAccess(
    { authorization: request.headers.get("authorization"), symbol },
    env,
    { verify, page: (s) => (pages as Record<string, EnginePage>)[s] },
  );
  return new Response(JSON.stringify(r.body), {
    status: r.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      ...(r.status === 401 ? { "www-authenticate": "Bearer" } : {}),
    },
  });
}
