// خادم فقط: يقرأ مقارنة النظراء من API المحرك. المفتاح لا يصل إلى المتصفح أبدًا (D2).
import {
  PEER_METRICS,
  buildPeerTable,
  companyKindFromIndustry,
  type EnginePeerResponse,
  type PeerTable,
} from "./peer-comparison";

type Env = Record<string, string | undefined>;

/** العلم معطّل افتراضيًا: لا يُفعَّل إلا بالقيمة "true" حرفيًا. */
export function enginePeersEnabled(env: Env = process.env): boolean {
  return env["ENGINE_PEERS_ENABLED"] === "true";
}

const TIMEOUT_MS = 4000;

async function getJson(
  url: string,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      headers: { "X-API-Key": apiKey },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * يعيد جدول المقارنة بعد قواعد الثقة، أو null حين يكون العلم معطّلًا أو الإعداد ناقصًا.
 * أي فشل في المحرك يُعاد كجدول `unavailable`، ولا يُستبدل ببيانات أخرى.
 */
export async function fetchPeerTable(
  input: { market: string; symbol: string },
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<PeerTable | null> {
  if (!enginePeersEnabled(env)) return null;
  const base = env["FINENGINE_API_URL"]?.replace(/\/+$/, "");
  const apiKey = env["FINENGINE_API_KEY"];
  if (!base || !apiKey) return null;

  const market = encodeURIComponent(input.market.toUpperCase());
  const symbol = encodeURIComponent(input.symbol.toUpperCase());
  const overview = (await getJson(
    `${base}/v1/companies/${market}/${symbol}`,
    apiKey,
    fetchImpl,
  )) as {
    industry?: string | null;
  } | null;
  const kind = companyKindFromIndustry(overview?.industry);
  if (!overview) return buildPeerTable(null, kind);

  const metrics = PEER_METRICS[kind].join(",");
  const peers = (await getJson(
    `${base}/v1/companies/${market}/${symbol}/peers?metrics=${encodeURIComponent(metrics)}&limit=25`,
    apiKey,
    fetchImpl,
  )) as EnginePeerResponse | null;
  return buildPeerTable(peers, kind);
}
