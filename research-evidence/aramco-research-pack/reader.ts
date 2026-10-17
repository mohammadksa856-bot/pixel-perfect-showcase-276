/**
 * WEB-08B04 — قارئ محلي للحزمة (loopback فقط، منفذ 4455). ليس مسارًا في التطبيق ولا نشرًا.
 * GET فقط، CSP يمنع السكربتات والنماذج، noindex، no-store. APP_BASE يُقبل على loopback فقط (قاعدة B03).
 *   bun research-evidence/aramco-research-pack/reader.ts   → http://127.0.0.1:4455/?lang=ar
 */
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { safeAppBase } from "../aramco-disclosures/demo";
import { loadContext } from "./evidence";
import { compilePack, gapRegister, topicMap, type CompiledParagraph, type Pack } from "./pack";
import type { Kind } from "./schema";

type L = "ar" | "en";
const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
const KIND: Record<Kind, { ar: string; en: string }> = {
  reported_record: { ar: "سجل المحرك", en: "Engine record" },
  management_plan: { ar: "خطة إدارة", en: "Management plan" },
  research_interpretation: { ar: "تفسير بحثي", en: "Research interpretation" },
  assumption: { ar: "افتراض", en: "Assumption" },
  scenario: { ar: "سيناريو نوعي", en: "Qualitative scenario" },
  methodology: { ar: "طريقة تحليل", en: "Methodology" },
  gap: { ar: "فجوة", en: "Gap" },
};
const label = (m: Record<string, { ar: string; en: string }>, k: string, l: L) =>
  esc(m[k]?.[l] ?? k);
/** حالات مشاريع B03 بلغة مقروءة؛ الرمز الأصلي يبقى في السمة data-*. */
const FIELD: Record<string, { ar: string; en: string }> = {
  commenced_production: {
    ar: "بدأ الإنتاج (تقرير 2025)",
    en: "Commenced production (2025 report)",
  },
  commenced_operations: {
    ar: "بدأ التشغيل (تقرير 2025)",
    en: "Commenced operations (2025 report)",
  },
  onstream: { ar: "دخل الخدمة (تقرير 2025)", en: "Came onstream (2025 report)" },
  target: { ar: "هدف إدارة، لا إنجاز", en: "Management target, not an achievement" },
  stated_in_engine_quote_not_extracted: {
    ar: "مذكور في مقطع المحرك؛ لم يُستخرج",
    en: "Stated in the engine excerpt; not extracted",
  },
  in_original_per_independent_review_not_extracted: {
    ar: "في الأصل وفق المراجع؛ لم يُستخرج",
    en: "In the original per the reviewer; not extracted",
  },
  not_in_engine_record_original_unchecked: {
    ar: "غير مذكور في السجل؛ الأصل لم يُفحص",
    en: "Not in the record; original unchecked",
  },
};
const cell = (head: string, code: string, l: L) =>
  `<td data-label="${esc(head)}" data-field-status="${esc(code)}">${label(FIELD, code, l)}</td>`;

function link(base: string | null, path: string, text: string) {
  return base
    ? `<a href="${esc(base + path)}">${esc(text)}</a>`
    : `<span data-link-disabled>${esc(text)}</span>`;
}

function para(p: CompiledParagraph, l: L): string {
  const text = l === "en" && p.en ? p.en : p.ar;
  const lang = l === "en" && p.en ? "en" : "ar";
  return `<article class="card k-${esc(p.kind)}" id="p-${esc(p.id)}" data-paragraph="${esc(p.id)}" data-kind="${esc(p.kind)}" data-status="${esc(p.status)}">
<header><span class="badge">${label(KIND, p.kind, l)}</span><span class="badge st">${esc(p.status)}</span><span class="topics">${p.topics.map(esc).join(" · ")}</span></header>
<div lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">${text
    .split("\n")
    .filter((x) => x.trim())
    .map((x) => `<p>${esc(x)}</p>`)
    .join(
      "",
    )}</div>${l === "en" && !p.en ? `<p class="muted" data-translation-pending>Translation pending; Arabic is the primary text.</p>` : ""}
<details><summary>${l === "ar" ? "الأدلة" : "Evidence"} (${p.refs.length})</summary><ul>${p.refs
    .map(
      (r) =>
        `<li><code>${esc(r.label)}</code> — ${esc(r.status)}${r.source.page !== null ? ` · ${l === "ar" ? "ص المحرك" : "engine p."} ${esc(r.source.page)}` : ""}${r.periods?.length ? ` · <bdi dir="ltr">${esc(r.periods.join(" "))}</bdi>` : ""}</li>`,
    )
    .join("")}</ul></details>
</article>`;
}

export function renderReader(pack: Pack, l: L, appBase: string): string {
  const base = safeAppBase(appBase);
  const ctx = loadContext();
  const byParent = (id: string) => pack.paragraphs.filter((p) => p.parent === id);
  const sections = pack.sections
    .map((s) => {
      const body = pack.paragraphs
        .filter((p) => p.section === s.id && p.role === "body")
        .map((p) => para(p, l))
        .join("");
      const projects =
        s.id === "projects-growth"
          ? pack.projects
              .map(
                (pr) =>
                  `<section class="sub" data-project="${esc(pr.id)}"><h3>${l === "ar" ? "مشروع" : "Project"}: <bdi dir="ltr">${esc(pr.id)}</bdi></h3>
<table class="stack"><thead><tr><th>${l === "ar" ? "الحالة" : "Status"}</th><th>${l === "ar" ? "السعة" : "Capacity"}</th><th>${l === "ar" ? "التوقيت" : "Timing"}</th><th>${l === "ar" ? "التكلفة" : "Cost"}</th></tr></thead><tbody><tr>
${cell(l === "ar" ? "الحالة" : "Status", pr.b03.executionStatus, l)}${cell(l === "ar" ? "السعة" : "Capacity", pr.b03.capacity, l)}${cell(l === "ar" ? "التوقيت" : "Timing", pr.b03.timing, l)}${cell(l === "ar" ? "التكلفة" : "Cost", pr.b03.cost, l)}</tr></tbody></table>
${byParent(pr.id)
  .map((p) => para(p, l))
  .join("")}</section>`,
              )
              .join("")
          : "";
      const analyses =
        s.id === "financial-drivers"
          ? pack.analyses
              .map(
                (a) =>
                  `<section class="sub" data-analysis="${esc(a.id)}" data-status="BLOCKED"><h3>${esc(l === "ar" ? a.title.ar : a.title.en)} <span class="badge st">BLOCKED</span></h3>
<p><b>${l === "ar" ? "التعريف" : "Definition"}</b> (${esc(a.definition.basis)}): <span lang="ar" dir="rtl">${esc(a.definition.ar)}</span></p>
<p class="muted">${l === "ar" ? "الموانع" : "Blockers"}: ${a.blockers.map(esc).join(", ")}</p>
<table class="stack"><thead><tr><th>${l === "ar" ? "المدخل" : "Input"}</th><th>${l === "ar" ? "الفترات" : "Periods"}</th><th>${l === "ar" ? "الحالة" : "Status"}</th><th>Marefa Data</th></tr></thead><tbody>${a.inputs
                    .map(
                      (i) =>
                        `<tr data-input="${esc(i.key)}" data-input-status="${esc(i.status)}"><td data-label="${l === "ar" ? "المدخل" : "Input"}"><code>${esc(i.key)}</code>${i.dims ? ` <small>${esc(Object.values(i.dims).join("/"))}</small>` : ""}</td><td data-label="${l === "ar" ? "الفترات" : "Periods"}"><bdi dir="ltr">${esc(i.periods.join(" "))}</bdi></td><td data-label="${l === "ar" ? "الحالة" : "Status"}">${esc(i.status)}</td><td data-label="Marefa Data">${link(base, i.links.intelligence, l === "ar" ? "تحليل" : "Intelligence")} · ${link(base, i.links.data, l === "ar" ? "بيانات" : "Data")}</td></tr>`,
                    )
                    .join("")}</tbody></table>
<ul class="q" lang="ar" dir="rtl">${a.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>
${byParent(a.id)
  .map((p) => para(p, l))
  .join("")}</section>`,
              )
              .join("")
          : "";
      return `<section class="sec" id="s-${esc(s.id)}" data-section="${esc(s.id)}"><h2>${esc(l === "ar" ? s.title.ar : s.title.en)}</h2>${body}${projects}${analyses}</section>`;
    })
    .join("");
  const topics = `<section class="sec" id="topics" data-topic-map><h2>${l === "ar" ? "الموضوعات الثمانية عشر" : "The 18 investor topics"}</h2>
<table class="stack"><thead><tr><th>${l === "ar" ? "الموضوع" : "Topic"}</th><th>${l === "ar" ? "الحالة" : "Status"}</th><th>${l === "ar" ? "فقرات" : "Paragraphs"}</th><th>${l === "ar" ? "تحليلات" : "Analyses"}</th><th>${l === "ar" ? "روابط" : "Links"}</th></tr></thead><tbody>${topicMap(
    pack,
  )
    .map(
      (t) =>
        `<tr data-topic="${esc(t.topic)}" data-topic-status="${esc(t.status)}"><td data-label="${l === "ar" ? "الموضوع" : "Topic"}"><code>${esc(t.topic)}</code></td><td data-label="${l === "ar" ? "الحالة" : "Status"}">${esc(t.status)}</td><td data-label="${l === "ar" ? "فقرات" : "Paragraphs"}">${t.paragraphs.length}</td><td data-label="${l === "ar" ? "تحليلات" : "Analyses"}">${t.analyses.length}</td><td data-label="${l === "ar" ? "روابط" : "Links"}">${link(base, t.links.intelligence, l === "ar" ? "تحليل" : "Intelligence")} · ${link(base, t.links.data, l === "ar" ? "بيانات" : "Data")}</td></tr>`,
    )
    .join("")}</tbody></table></section>`;
  const gaps = gapRegister(pack, ctx);
  const gapSummary = `<section class="sec" id="gaps" data-gaps><h2>${l === "ar" ? "سجل الفجوات" : "Gap register"} <small>(${gaps.length})</small></h2><ul>${[
    ...new Set(gaps.map((g) => g.kind)),
  ]
    .map((k) => `<li><code>${esc(k)}</code>: ${gaps.filter((g) => g.kind === k).length}</li>`)
    .join(
      "",
    )}</ul><p class="muted">${l === "ar" ? "التفصيل الكامل في GAP-REGISTER.json." : "Full detail in GAP-REGISTER.json."}</p></section>`;
  const dir = l === "ar" ? "rtl" : "ltr";
  return `<!doctype html><html lang="${l}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${l === "ar" ? "أرامكو — حزمة بحث غير معتمدة" : "Aramco — unapproved research pack"}</title>
<style>
:root{color-scheme:dark;--bg:#0f1420;--card:#171e2c;--fg:#e6eaf0;--muted:#a8b3c4;--line:#2a3446;--brand:#5fa8ff;--warn:#f0b35a;--bad:#ff8a8a}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.8 system-ui,"Segoe UI",Tahoma,sans-serif}
main{max-width:60rem;margin:0 auto;padding:1rem}
.banner{border:2px solid var(--warn);background:#2a2112;padding:.75rem 1rem;border-radius:.75rem}
.bad{color:var(--bad)} a{color:var(--brand)} a:focus-visible,summary:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
h2{font-size:1.25rem;border-bottom:1px solid var(--line);padding-bottom:.4rem;margin-top:2rem} h3{font-size:1.05rem}
.card{background:var(--card);border:1px solid var(--line);border-inline-start:4px solid var(--line);border-radius:.6rem;padding:.7rem 1rem;margin:.7rem 0}
.k-reported_record{border-inline-start-color:#5fd39a}.k-management_plan{border-inline-start-color:var(--warn)}.k-research_interpretation{border-inline-start-color:var(--brand)}.k-assumption,.k-scenario{border-inline-start-color:#c49bff}.k-gap{border-inline-start-color:var(--bad)}
.card header{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;font-size:.78rem}
.badge{border:1px solid var(--line);border-radius:999px;padding:0 .55rem}.st{color:#ffc2c2;border-color:var(--bad)}
.topics,.muted,small,details{color:var(--muted);font-size:.82rem} .card p{margin:.35rem 0}
code,td{overflow-wrap:anywhere;word-break:break-word} details li{overflow-wrap:anywhere}
table{border-collapse:collapse;width:100%;font-size:.85rem;margin:.5rem 0} th,td{border-bottom:1px solid var(--line);padding:.4rem;text-align:start;vertical-align:top}
.sub{margin:1rem 0;padding-inline-start:.6rem;border-inline-start:1px dashed var(--line)}
nav.top{display:flex;flex-wrap:wrap;gap:.8rem;margin:.6rem 0}
@media (max-width:760px){table.stack thead{display:none}table.stack tr{display:block;border:1px solid var(--line);border-radius:.6rem;margin:.5rem 0;padding:.3rem .6rem}table.stack td{display:block;border:0;padding:.2rem 0}table.stack td::before{content:attr(data-label);display:block;color:var(--muted);font-size:.75rem}}
</style></head><body><main>
<aside class="banner" role="note" data-banner><b>${l === "ar" ? "مسودة بحث غير معتمدة — محلية فقط — لا تُنشر" : "Unapproved research draft — local only — not for publication"}</b><br>${l === "ar" ? "لا فقرة معتمدة. الادعاءات الـ22 والمدخلات الـ142 محجوبة. لا أرقام مالية؛ الأرقام في Marefa Data عبر الروابط. كل التحليلات الكمية BLOCKED." : "No paragraph is approved. The 22 claims and 142 inputs are withheld. No financial figures; figures are in Marefa Data via links. All quantitative analyses are BLOCKED."}</aside>
${base ? "" : `<aside class="banner" role="alert" data-app-base-rejected><b class="bad">${l === "ar" ? "APP_BASE مرفوض: روابط التطبيق معطلة." : "APP_BASE rejected: app links are disabled."}</b></aside>`}
<h1>${l === "ar" ? "أرامكو السعودية (2222) — حزمة بحث استثماري متعمق" : "Saudi Aramco (2222) — in-depth investment research pack"}</h1>
<nav class="top" aria-label="sections"><a href="?lang=${l === "ar" ? "en" : "ar"}" data-lang-toggle>${l === "ar" ? "English" : "العربية"}</a>${pack.sections.map((s) => `<a href="#s-${esc(s.id)}">${esc(l === "ar" ? s.title.ar : s.title.en)}</a>`).join("")}<a href="#topics">${l === "ar" ? "الموضوعات" : "Topics"}</a><a href="#gaps">${l === "ar" ? "الفجوات" : "Gaps"}</a></nav>
${sections}${topics}${gapSummary}
</main></body></html>`;
}

export function createReaderServer(appBase = process.env["APP_BASE"] ?? "http://127.0.0.1:5173") {
  if (!safeAppBase(appBase))
    throw Error("unsafe_app_base: only http(s) loopback origins are allowed");
  const pack = compilePack();
  return createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end("Read-only local reader");
      return;
    }
    const u = new URL(req.url ?? "/", "http://127.0.0.1");
    if (u.pathname !== "/") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found (local reader has one page)");
      return;
    }
    const l: L = u.searchParams.get("lang") === "en" ? "en" : "ar";
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderReader(pack, l, appBase));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  createReaderServer().listen(4455, "127.0.0.1", () =>
    console.log("Local unapproved research reader: http://127.0.0.1:4455/?lang=ar"),
  );
