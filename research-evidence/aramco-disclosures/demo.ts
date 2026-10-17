/**
 * WEB-08B03 — عرض تجريبي محلي (loopback فقط) لمساحة البحث المنظمة حسب موضوعات Company Intelligence.
 * ليس مسارًا في التطبيق ولا نشرًا على Vercel. GET فقط، CSP يمنع السكربتات والنماذج، noindex، no-store.
 * يعرض اقتباسات حرفية بحالة WITHHELD، ولا يعرض قيمًا مالية؛ الأرقام في Marefa Data.
 *   bun research-evidence/aramco-disclosures/demo.ts   → http://127.0.0.1:4453/?lang=ar
 */
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import {
  buildRegister,
  groupOfTopic,
  loadB02,
  loadSnapshot,
  type ClaimRecord,
  type Register,
} from "./register";
import type { Category, EffectPeriod, Topic } from "./curation";

type L = "ar" | "en";
const T = (ar: string, en: string) => ({ ar, en });
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
const safeHref = (u: string) => {
  try {
    const x = new URL(u);
    return x.protocol === "https:" && !x.username && !x.password ? esc(x.href) : null;
  } catch {
    return null;
  }
};

const TOPIC_TITLE: Record<Topic, { ar: string; en: string }> = {
  identity: T("هوية الشركة", "Identity"),
  business: T("نموذج العمل", "Business model"),
  governance: T("الإدارة والحوكمة", "Management and governance"),
  ownership: T("الملكية", "Ownership"),
  financials: T("القوائم المالية التاريخية", "Historical financials"),
  earnings_quality: T("جودة الأرباح", "Earnings quality"),
  ratios: T("النسب المالية", "Financial ratios"),
  operations: T("المؤشرات التشغيلية", "Operational KPIs"),
  dividends_actions: T("التوزيعات وإجراءات الشركة", "Dividends and actions"),
  industry: T("القطاع والصناعة", "Industry and sector"),
  competitors: T("المنافسون والحصة السوقية", "Competitors"),
  trading: T("التداول والسيولة", "Trading and liquidity"),
  forecasts: T("التوجيهات والتوقعات", "Guidance and forecasts"),
  analysts: T("تغطية المحللين", "Analyst coverage"),
  valuation: T("التقييم", "Valuation"),
  risks: T("المخاطر والتعرضات", "Risks and exposures"),
  esg: T("الاستدامة", "Sustainability"),
  news: T("الأخبار ومواد المستثمرين", "News and materials"),
};
const GROUPS: { id: string; title: { ar: string; en: string }; topics: Topic[] }[] = [
  {
    id: "business",
    title: T("الشركة ونشاطها", "The business"),
    topics: ["identity", "business", "industry", "competitors"],
  },
  {
    id: "financials",
    title: T("الأداء المالي", "Financial performance"),
    topics: ["financials", "earnings_quality", "ratios", "operations"],
  },
  {
    id: "shareholders",
    title: T("المساهمون والحوكمة", "Shareholders and governance"),
    topics: ["ownership", "dividends_actions", "governance"],
  },
  {
    id: "market",
    title: T("السوق والتقييم", "Market and valuation"),
    topics: ["trading", "valuation", "forecasts", "analysts"],
  },
  {
    id: "risks",
    title: T("المخاطر والإفصاحات", "Risks and disclosures"),
    topics: ["risks", "esg", "news"],
  },
];
const CATEGORY: Record<Category, { ar: string; en: string }> = {
  official_fact: T("واقعة رسمية منشورة", "Published official fact"),
  management_plan: T("خطة / توجيه إدارة", "Management plan / guidance"),
  assumption: T("افتراض", "Assumption"),
  research_opinion: T("رأي بحثي", "Research opinion"),
};
const PLAN: Record<string, { ar: string; en: string }> = {
  issuer_guidance: T("توجيه مُصدر", "Issuer guidance"),
  management_target: T("هدف إدارة", "Management target"),
  management_expectation: T("توقع إدارة", "Management expectation"),
};
const GAP: Record<string, { ar: string; en: string }> = {
  engine_record_id_missing: T("لا معرف ثابت للسجل في المحرك", "No stable engine record id"),
  document_version_missing: T("إصدار المستند غير معروف", "Document version unknown"),
  original_artifact_sha256_missing: T(
    "بصمة الملف الأصلي غير مثبتة",
    "Original file hash not pinned",
  ),
  locator_missing: T("لا صفحة أو موضع", "No page or locator"),
  locator_unverified: T("الصفحة غير مراجَعة", "Page not reviewed"),
  documented_rights_grant_missing: T("لا منحة حقوق موثقة", "No documented rights grant"),
  independent_review_receipt_missing: T(
    "لا مراجعة مالية مستقلة",
    "No independent financial review",
  ),
  editorial_review_missing: T("لا إجازة تحريرية", "No editorial approval"),
  source_url_not_https: T("رابط المصدر غير آمن", "Source URL not HTTPS"),
};
const WARN: Record<string, { ar: string; en: string }> = {
  evidence_published_after_event: T(
    "المصدر نُشر بعد الحدث (استرجاعي)",
    "Source published after the event (retrospective)",
  ),
  classification_override: T(
    "تصنيفنا يخالف تصنيف المحرك",
    "Our classification overrides the engine's",
  ),
  quote_not_copied_links_marefa_data: T(
    "لا اقتباس؛ الأرقام في Marefa Data",
    "No quote; figures are in Marefa Data",
  ),
  same_event_multiple_records: T("الحدث نفسه في أكثر من سجل", "Same event in several records"),
};
const STATUS: Record<string, { ar: string; en: string }> = {
  commenced_production: T(
    "بدأ الإنتاج (وفق تقرير 2025)",
    "Commenced production (per the 2025 report)",
  ),
  commenced_operations: T(
    "بدأ التشغيل (وفق تقرير 2025)",
    "Commenced operations (per the 2025 report)",
  ),
  onstream: T("دخل الخدمة (وفق تقرير 2025)", "Came onstream (per the 2025 report)"),
  target: T("هدف إدارة، لا إنجاز", "Management target, not an achievement"),
  not_disclosed: T("غير معلن", "Not disclosed"),
};
const EVENT: Record<string, { ar: string; en: string }> = {
  capital_guidance: T("توجيه إنفاق رأسمالي", "Capital spending guidance"),
  strategy_target: T("هدف إستراتيجي", "Strategic target"),
  project_milestone: T("مرحلة مشروع", "Project milestone"),
  commercial_contract: T("عقد تجاري", "Commercial contract"),
  purchase_commitment: T("التزام شراء", "Purchase commitment"),
  contingency: T("التزامات محتملة", "Contingencies"),
  customer_credit_concentration: T("تركّز ائتمان العملاء", "Customer credit concentration"),
  risk_factor: T("عامل مخاطر", "Risk factor"),
  dividend_declaration: T("إعلان توزيع", "Dividend declaration"),
  dividend_paid: T("توزيعات مدفوعة", "Dividends paid"),
  buyback_program: T("برنامج إعادة شراء", "Buyback program"),
  acquisition: T("استحواذ", "Acquisition"),
  bonus_shares: T("أسهم منحة", "Bonus shares"),
  capital_increase: T("زيادة رأس المال", "Capital increase"),
  results_publication: T("نشر النتائج", "Results publication"),
};

function effectText(e: EffectPeriod, l: L): string {
  const n = esc(e.note);
  switch (e.kind) {
    case "fiscal_year":
      return `${l === "ar" ? "السنة المالية" : "FY"} ${e.fiscalYear} · ${n}`;
    case "as_of":
      return `${l === "ar" ? "كما في" : "As of"} <span dir="ltr">${e.date}</span> · ${n}`;
    case "reporting_period":
      return `<span dir="ltr">${e.start} → ${e.end}</span> · ${n}`;
    case "through_year":
      return `${l === "ar" ? "حتى" : "Through"} ${e.targetYear}${e.baseYear ? (l === "ar" ? ` (أساس ${e.baseYear})` : ` (base ${e.baseYear})`) : ""} · ${n}`;
    case "term":
      return `${e.years ? `${e.years} ${l === "ar" ? "سنة" : "years"}` : `${e.months} ${l === "ar" ? "شهرًا" : "months"}`} · ${n}`;
    case "event_date":
      return `<span dir="ltr">${e.date}</span> · ${n}`;
    default:
      return `${l === "ar" ? "غير معلن" : "Not disclosed"} · ${n}`;
  }
}

function claimCard(c: ClaimRecord, l: L, appBase: string): string {
  const t = (x: { ar: string; en: string }) => esc(x[l]);
  const src = safeHref(c.evidence.url);
  const loc = [
    c.evidence.page !== null ? `${l === "ar" ? "ص" : "p."} ${c.evidence.page}` : null,
    c.evidence.note ? `${l === "ar" ? "إيضاح" : "note"} ${esc(c.evidence.note)}` : null,
    c.evidence.table ? esc(c.evidence.table) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `<article class="card" data-claim="${esc(c.id)}" data-category="${c.category}" data-status="${c.qualification.status}">
<header><span class="badge cat-${c.category}">${t(CATEGORY[c.category])}${c.planKind ? ` · ${t(PLAN[c.planKind]!)}` : ""}</span>
<span class="badge withheld">WITHHELD · ${l === "ar" ? "غير مؤهل للنشر" : "not eligible for publication"}</span>
<span class="type">${t(EVENT[c.eventType]!)}</span></header>
${c.quote !== null ? `<blockquote lang="en" dir="ltr" data-quote>${esc(c.quote)}</blockquote><p class="lang">${l === "ar" ? "اقتباس حرفي بالإنجليزية من نص الإفصاح في المحرك" : "Verbatim quote from the engine disclosure text"}</p>` : `<p data-no-quote>${l === "ar" ? "لا اقتباس: النص يحمل أرقام القوائم المالية، وهي معروضة في Marefa Data." : "No quote: the text carries financial-statement figures, which are shown in Marefa Data."}</p>`}
<dl>
<dt>${l === "ar" ? "نُشر المصدر" : "Source published"}</dt><dd dir="ltr">${esc(c.evidence.filedAt)}</dd>
<dt>${l === "ar" ? "فترة الأثر" : "Effect period"}</dt><dd>${effectText(c.effect, l)}</dd>
<dt>${l === "ar" ? "المصدر" : "Source"}</dt><dd>${src ? `<a href="${src}" rel="noopener noreferrer" data-source>${esc(c.evidence.filingType)}</a>` : esc(c.evidence.filingType)}${loc ? ` · ${loc}` : ""}${c.evidence.pdfSha256 ? ` · <code title="WEB-08B02">PDF sha256 ${c.evidence.pdfSha256.slice(0, 12)}…</code>` : ""}</dd>
</dl>
<p class="gaps" data-gaps>${l === "ar" ? "ما ينقص للتأهيل:" : "Missing for qualification:"} ${c.qualification.gaps.map((g) => `<span class="gap">${t(GAP[g]!)}</span>`).join(" ")}</p>
${c.qualification.warnings.length ? `<p class="warn" data-warnings>${c.qualification.warnings.map((w) => t(WARN[w]!)).join(" · ")}</p>` : ""}
${c.override ? `<p class="warn" data-override>${esc(c.override)}</p>` : ""}
<nav class="links"><a href="${esc(appBase + c.links.intelligence)}" data-link-intelligence>${l === "ar" ? "تحليل الشركة ←" : "Company Intelligence →"}</a> <a href="${esc(appBase + c.links.marefaData)}" data-link-marefa>${l === "ar" ? "بيانات معرفة ←" : "Marefa Data →"}</a></nav>
</article>`;
}

export function renderWorkspace(r: Register, l: L, appBase: string): string {
  const t = (x: { ar: string; en: string }) => esc(x[l]);
  const byTopic = new Map(r.topicMap.map((x) => [x.topic, x]));
  const claimById = new Map(r.claims.map((c) => [c.id, c]));
  const groups = GROUPS.map((g) => {
    const topics = g.topics
      .map((topic) => {
        const m = byTopic.get(topic)!;
        const cards = m.claims.map((id) => claimCard(claimById.get(id)!, l, appBase)).join("");
        const cross = m.crossClaims.length
          ? `<p class="cross">${l === "ar" ? "مرتبط أيضًا:" : "Also related:"} ${m.crossClaims.map((id) => `<a href="#c-${esc(id)}">${esc(id)}</a>`).join(" ")}</p>`
          : "";
        const docs = m.documents.length
          ? `<p>${l === "ar" ? "وثائق السلسلة:" : "Report editions:"} ${m.documents.length} — <a href="#documents">${l === "ar" ? "سجل الوثائق" : "document register"}</a></p>`
          : "";
        const empty =
          m.status === "no_disclosure_in_sample"
            ? `<p class="empty" data-empty>${l === "ar" ? "لا إفصاح في العينة لهذا الموضوع؛ لا محتوى مُنشأ لسدّه." : "No disclosure in the sample for this topic; nothing is authored to fill it."}</p>`
            : "";
        return `<section id="topic-${topic}" data-topic="${topic}" data-topic-status="${m.status}"><h3>${t(TOPIC_TITLE[topic])} <small>(${m.claims.length})</small></h3>${empty}${cards}${cross}${docs}</section>`;
      })
      .join("");
    return `<section class="group" id="group-${g.id}" data-group="${g.id}"><h2>${t(g.title)}</h2>${topics}</section>`;
  }).join("");

  const projects = `<section id="projects" data-projects><h2>${l === "ar" ? "نموذج المشاريع" : "Project model"}</h2>
<div class="scroll"><table><thead><tr><th>${l === "ar" ? "المشروع" : "Project"}</th><th>${l === "ar" ? "الحالة" : "Status"}</th><th>${l === "ar" ? "السعة" : "Capacity"}</th><th>${l === "ar" ? "الموعد المستهدف" : "Target date"}</th><th>${l === "ar" ? "التكلفة المعلنة" : "Disclosed cost"}</th><th>${l === "ar" ? "مؤشرات منشورة ذات صلة" : "Related published indicators"}</th><th>${l === "ar" ? "المحركات الاقتصادية" : "Economic drivers"}</th></tr></thead><tbody>
${r.projects
  .map(
    (
      p,
    ) => `<tr data-project="${esc(p.id)}"><td><b>${esc(p.name)}</b><br><small>${p.description.map((d) => `<span lang="en" dir="ltr">“${esc(d.quote)}”</span>`).join("<br>")}</small></td>
<td data-execution-status="${esc(p.executionStatus.state)}">${t(STATUS[p.executionStatus.state] ?? T(p.executionStatus.state, p.executionStatus.state))}</td>
<td data-unknown>${l === "ar" ? "غير معلنة في المصادر المتاحة" : "Not disclosed in available sources"}</td>
<td>${p.targetDate.status === "management_target" ? `${p.targetDate.year} (${l === "ar" ? "هدف إدارة" : "management target"})` : `<span data-unknown>${l === "ar" ? "غير معلن" : "Not disclosed"}</span>`}</td>
<td data-unknown>${l === "ar" ? "غير معلنة" : "Not disclosed"}</td>
<td>${p.relatedEngineMetrics.map((m) => (m.presentInSnapshot ? `<a href="${esc(`${appBase}/preview/web-v1/companies/${r.company.symbol}/intelligence?topic=operations&focus=${m.key}`)}">${esc(m.key)}</a>` : esc(m.key))).join(", ")}</td>
<td data-not-authored>${l === "ar" ? "غير مؤلَّفة: تحتاج منهجية ومراجعة معتمدتين" : "Not authored: needs an approved methodology and review"}</td></tr>`,
  )
  .join("")}
</tbody></table></div></section>`;

  const rg = r.riskGuidance.categories;
  const register = `<section id="risk-guidance" data-risk-guidance><h2>${l === "ar" ? "سجل المخاطر والتوجيهات" : "Risk and guidance register"}</h2>
<div class="grid">${(Object.keys(rg) as Category[])
    .map(
      (k) =>
        `<div class="cell" data-register-category="${k}"><b>${t(CATEGORY[k])}</b> <span class="n">${rg[k].length}</span><p>${esc(r.riskGuidance.notes[k])}</p><ul>${rg[k].map((id) => `<li><a href="#c-${esc(id)}">${esc(id)}</a></li>`).join("")}</ul></div>`,
    )
    .join("")}</div></section>`;

  const events = `<section id="events" data-events><h2>${l === "ar" ? "سجل الأحداث" : "Event register"} <small>(${r.events.length})</small></h2>
<div class="scroll"><table><thead><tr><th>${l === "ar" ? "الحدث" : "Event"}</th><th>${l === "ar" ? "النوع" : "Type"}</th><th>${l === "ar" ? "أول دليل" : "First evidence"}</th><th>${l === "ar" ? "السجلات" : "Records"}</th><th>${l === "ar" ? "الموضوع" : "Topic"}</th></tr></thead><tbody>
${r.events.map((e) => `<tr data-event="${esc(e.eventId)}"><td>${esc(e.eventId)}</td><td>${t(EVENT[e.eventType]!)}</td><td dir="ltr">${esc(e.firstEvidenceFiledAt)}</td><td>${e.records.length}</td><td>${t(TOPIC_TITLE[e.topic])}</td></tr>`).join("")}
</tbody></table></div></section>`;

  const documents = `<section id="documents" data-documents><h2>${l === "ar" ? "سجل الوثائق وإصداراتها" : "Document and edition register"} <small>(${r.documents.length})</small></h2>
<div class="scroll"><table><thead><tr><th>${l === "ar" ? "السلسلة" : "Series"}</th><th>${l === "ar" ? "الإصدار" : "Edition"}</th><th>${l === "ar" ? "النشر" : "Filed"}</th><th>PDF sha256</th><th>${l === "ar" ? "سجلات مصدر في المحرك" : "Engine source records"}</th><th>${l === "ar" ? "في اللقطة" : "In snapshot"}</th></tr></thead><tbody>
${r.documents.map((d) => `<tr data-document="${esc(d.artifactUrl)}"><td>${esc(d.family)}</td><td>${safeHref(d.artifactUrl) ? `<a href="${safeHref(d.artifactUrl)}" rel="noopener noreferrer">${esc(d.editions.join(", ") || d.artifactUrl.split("/").pop() || "")}</a>` : esc(d.artifactUrl)}</td><td dir="ltr">${esc(d.firstFiledAt)}</td><td>${d.pdfSha256 ? `<code>${d.pdfSha256.slice(0, 12)}…</code> (B02)` : l === "ar" ? "غير مثبتة" : "not pinned"}</td><td>${d.sourceRecords.length}</td><td>${d.inEngineSnapshot ? (l === "ar" ? "نعم" : "yes") : l === "ar" ? "لا (B02 فقط)" : "no (B02 only)"}</td></tr>`).join("")}
</tbody></table></div></section>`;

  const dir = l === "ar" ? "rtl" : "ltr";
  return `<!doctype html><html lang="${l}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${l === "ar" ? "أرامكو — مساحة بحث غير معتمدة" : "Aramco — unapproved research workspace"}</title>
<style>
:root{color-scheme:dark;--bg:#0f1420;--card:#171e2c;--fg:#e6eaf0;--muted:#a8b3c4;--line:#2a3446;--brand:#5fa8ff;--warn:#f0b35a;--bad:#ff8a8a}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 system-ui,"Segoe UI",Tahoma,sans-serif;overflow-wrap:anywhere}
main{max-width:72rem;margin:0 auto;padding:1rem}
aside.banner{border:2px solid var(--warn);background:#2a2112;padding:.75rem 1rem;border-radius:.75rem;margin-bottom:1rem}
a{color:var(--brand)} a:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
h1{font-size:1.5rem;margin:.25rem 0} h2{font-size:1.2rem;border-bottom:1px solid var(--line);padding-bottom:.4rem;margin-top:2rem} h3{font-size:1rem;margin:1.25rem 0 .5rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:.75rem;padding:.9rem 1rem;margin:.6rem 0}
.card header{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}
.badge{font-size:.75rem;border:1px solid var(--line);border-radius:999px;padding:.05rem .55rem}
.cat-official_fact{border-color:#5fd39a;color:#a8f0cb}.cat-management_plan{border-color:var(--warn);color:#ffd9a0}
.withheld{border-color:var(--bad);color:#ffc2c2}.type{color:var(--muted);font-size:.8rem}
blockquote{margin:.6rem 0;padding:.4rem .8rem;border-inline-start:3px solid var(--brand);background:#111827;text-align:left}
.lang,.gaps,.warn,.cross,.empty,small{color:var(--muted);font-size:.8rem}
.gap{display:inline-block;border:1px dashed var(--line);border-radius:.4rem;padding:0 .35rem;margin:.1rem}
.warn{color:#ffd9a0}
dl{display:grid;grid-template-columns:auto 1fr;gap:.2rem .8rem;margin:.4rem 0;font-size:.85rem} dt{color:var(--muted)}
.links a{margin-inline-end:1rem}
.scroll{overflow-x:auto} table{border-collapse:collapse;width:100%;font-size:.85rem} th,td{border-bottom:1px solid var(--line);padding:.45rem;text-align:start;vertical-align:top}
.grid{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))} .cell{background:var(--card);border:1px solid var(--line);border-radius:.75rem;padding:.75rem}
.n{font-size:1.2rem;font-weight:700} nav.top{display:flex;flex-wrap:wrap;gap:.75rem;margin:.5rem 0}
</style></head><body><main>
<aside class="banner" role="note" data-banner><b>${l === "ar" ? "عينة بحثية غير معتمدة — محلية فقط — لا تُنشر" : "Unapproved research sample — local only — not for publication"}</b><br>${l === "ar" ? "كل الادعاءات WITHHELD وفق عقد WEB-08B01. اقتباسات حرفية من إفصاحات المحرك المجمدة (لقطة " : "All claims are WITHHELD under the WEB-08B01 contract. Verbatim quotes from the frozen engine disclosures (snapshot "}<span dir="ltr">${esc(r.snapshot.generatedAt)}</span>)${l === "ar" ? "؛ لا توقعات ولا تقييم ولا رأي بحثي ولا قيم مالية مخزنة." : "; no forecasts, valuation, research opinion or stored financial values."}</aside>
<h1>${l === "ar" ? "أرامكو السعودية — الإفصاحات في بنية تحليل الشركة" : "Saudi Aramco — disclosures in the Company Intelligence structure"}</h1>
<nav class="top" aria-label="sections"><a href="?lang=${l === "ar" ? "en" : "ar"}" data-lang-toggle>${l === "ar" ? "English" : "العربية"}</a><a href="#projects">${l === "ar" ? "المشاريع" : "Projects"}</a><a href="#risk-guidance">${l === "ar" ? "المخاطر والتوجيهات" : "Risks and guidance"}</a><a href="#events">${l === "ar" ? "الأحداث" : "Events"}</a><a href="#documents">${l === "ar" ? "الوثائق" : "Documents"}</a><a href="${esc(appBase)}/preview/web-v1/companies/${esc(r.company.symbol)}?tab=financials" data-marefa-data>${l === "ar" ? "القوائم المالية في Marefa Data" : "Financial statements in Marefa Data"}</a></nav>
${groups}${projects}${register}${events}${documents}
</main></body></html>`.replace(
    /<article class="card" data-claim="([^"]+)"/g,
    '<article class="card" id="c-$1" data-claim="$1"',
  );
}

export function createDemoServer(appBase = process.env["APP_BASE"] ?? "http://127.0.0.1:5173") {
  const register = buildRegister(loadSnapshot(), loadB02());
  return createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end("Read-only local demo");
      return;
    }
    const u = new URL(req.url ?? "/", "http://127.0.0.1");
    if (u.pathname !== "/") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found (local demo has one page)");
      return;
    }
    const l: L = u.searchParams.get("lang") === "en" ? "en" : "ar";
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderWorkspace(register, l, appBase));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  createDemoServer().listen(4453, "127.0.0.1", () =>
    console.log("Local unapproved research demo: http://127.0.0.1:4453/?lang=ar"),
  );
