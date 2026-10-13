// خادم فقط: يقرأ صفحة الشركة من API المحرك ويبني نموذج العرض قبل أي إرسال للمتصفح.
// المفتاح والعنوان لا يغادران الخادم، والقيم المحجوبة لا تُسلسل إلى العميل.
import { buildCompanyPreview, contractProblems, type CompanyPreview } from "./company-preview";

type Env = Record<string, string | undefined>;

/** معطّل افتراضيًا: لا يُفعَّل إلا بالقيمة "true" حرفيًا. */
export function enginePreviewEnabled(env: Env = process.env): boolean {
  return env["ENGINE_PREVIEW_ENABLED"] === "true";
}

export type PreviewResult =
  | { state: "disabled" }
  | { state: "not_found" }
  | { state: "engine_unavailable"; reason: string }
  | { state: "ok"; preview: CompanyPreview };

const TIMEOUT_MS = 8000;

export async function fetchCompanyPreview(
  input: { market: string; symbol: string },
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<PreviewResult> {
  if (!enginePreviewEnabled(env)) return { state: "disabled" };
  const base = env["FINENGINE_API_URL"]?.replace(/\/+$/, "");
  const apiKey = env["FINENGINE_API_KEY"];
  if (!base || !apiKey) return { state: "engine_unavailable", reason: "engine_not_configured" };

  const url = `${base}/v1/companies/${encodeURIComponent(input.market.toUpperCase())}/${encodeURIComponent(input.symbol.toUpperCase())}/page`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchImpl(url, { headers: { "X-API-Key": apiKey }, signal: controller.signal });
  } catch {
    return { state: "engine_unavailable", reason: "engine_unreachable" };
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) return { state: "not_found" };
  if (res.status === 401 || res.status === 403)
    return { state: "engine_unavailable", reason: "engine_auth_failed" };
  if (!res.ok) return { state: "engine_unavailable", reason: `engine_http_${res.status}` };

  let page: unknown;
  try {
    page = await res.json();
  } catch {
    return { state: "engine_unavailable", reason: "engine_invalid_json" };
  }
  // المحرك يعيد 200 مع {"error": "..."} لبعض الحالات.
  if (page && typeof page === "object" && "error" in page) return { state: "not_found" };
  const problems = contractProblems(page);
  if (problems.length)
    return { state: "engine_unavailable", reason: `contract_mismatch:${problems.join(",")}` };
  // No legacy fallback. Only current engine page5 can carry bound B06 inputs.
  if ((page as { contract_version?: number }).contract_version !== 5)
    return { state: "engine_unavailable", reason: "preview_requires_page5" };
  return { state: "ok", preview: buildCompanyPreview(page as Parameters<typeof buildCompanyPreview>[0]) };
}
