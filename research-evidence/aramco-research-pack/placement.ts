/**
 * WEB-08B04 (LINK-01) — موضع كل مقياس الفعلي في تجربة الشركة المقبولة (WEB-07)، محسوبًا من نموذج
 * التطبيق نفسه (`buildCompanyPreview`) فوق اللقطة المجمدة. قراءة فقط: لا يعدّل التطبيق.
 *
 * يطابق منطق الرابط العميق في Company Intelligence: `?focus=` يبحث داخل الموضوع المطلوب عن
 * `[data-metric]` (خلايا كتل المقاييس) أو `[data-fact]` أو `[data-row]` (صفوف مستكشف القوائم، في
 * الموضوع 5 فقط). منحنيات التاريخ (`data-chart`) ظاهرة لكنها لا تُستهدف بـ`focus`.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { buildCompanyPreview } from "../../src/lib/engine/company-preview";
import type { Topic } from "./schema";

const FIXTURE = new URL("../../tests/fixtures/codex-20261013/2222-page.json.gz", import.meta.url);

export type Placement = {
  topic: Topic;
  /** focus_metric: خلية مقياس؛ focus_statement_row: صف في مستكشف القوائم؛ chart_only: منحنى تاريخي فقط. */
  mode: "focus_metric" | "focus_statement_row" | "chart_only";
  /** الفترات المعروضة في الموضع حين تُعرف (خلية المقياس تعرض فترة واحدة). */
  shownPeriods: string[];
};

type Cell = { key: string; period?: { kind?: string; end?: string } };
type Block =
  | { type: "metrics"; group: { cells: Cell[] } }
  | { type: "history"; series: { key: string }[] }
  | { type: string };

let cache: Map<string, Placement[]> | null = null;

/** المفتاح → المواضع التي يظهر فيها فعلًا. */
export function metricPlacements(): Map<string, Placement[]> {
  if (cache) return cache;
  const raw = JSON.parse(gunzipSync(readFileSync(FIXTURE)).toString());
  const p = buildCompanyPreview(raw);
  const out = new Map<string, Placement[]>();
  const add = (key: string, pl: Placement) => {
    const list = out.get(key) ?? [];
    if (!list.some((x) => x.topic === pl.topic && x.mode === pl.mode)) list.push(pl);
    out.set(key, list);
  };
  for (const t of p.topics) {
    const topic = t.key as Topic;
    // الموضوع 5 (القوائم) يعرض مستكشف القوائم ويُسقط كتل التاريخ (company-template.tsx).
    const isStatements = t.ordinal === 5;
    for (const b of t.blocks as Block[]) {
      if (b.type === "metrics")
        for (const c of (b as Extract<Block, { type: "metrics" }>).group.cells)
          add(c.key, {
            topic,
            mode: "focus_metric",
            shownPeriods: c.period?.end ? [`${c.period.kind ?? "?"}@${c.period.end}`] : [],
          });
      if (b.type === "history" && !isStatements)
        for (const s of (b as Extract<Block, { type: "history" }>).series)
          add(s.key, { topic, mode: "chart_only", shownPeriods: [] });
    }
    if (isStatements)
      for (const v of p.statements)
        if (v.status === "available")
          for (const r of v.rows)
            add(r.key, {
              topic,
              mode: "focus_statement_row",
              shownPeriods: v.periods.map((x) => `${v.mode}@${x.end}`),
            });
  }
  cache = out;
  return out;
}
