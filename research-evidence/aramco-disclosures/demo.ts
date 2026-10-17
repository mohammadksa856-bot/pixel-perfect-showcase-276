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
  type ProjectRecord,
  type Register,
} from "./register";
import type { Category, EffectPeriod, Topic } from "./curation";

type L = "ar" | "en";
const T = (ar: string, en: string) => ({ ar, en });
const esc = (s: unknown) =>
  String(s).replace(
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

/**
 * R05: قاعدة روابط التطبيق المحلي. تُقبل فقط http(s) على loopback دون مسار أو بيانات اعتماد أو
 * استعلام؛ غير ذلك يُرفض (null) فلا تُبنى روابط منه.
 */
export function safeAppBase(appBase: string): string | null {
  try {
    const x = new URL(appBase);
    const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(x.hostname);
    if (
      !["http:", "https:"].includes(x.protocol) ||
      !loopback ||
      x.username ||
      x.password ||
      (x.pathname !== "/" && x.pathname !== "") ||
      x.search ||
      x.hash
    )
      return null;
    return x.origin;
  } catch {
    return null;
  }
}
const label = (m: Record<string, { ar: string; en: string }>, k: string, l: L) =>
  esc(m[k]?.[l] ?? k);

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
  engine_text_not_verified_against_original: T(
    "نص المحرك لم يُطابَق حرفيًا مع الأصل",
    "Engine text not verified verbatim against the original",
  ),
  independent_source_review_missing: T("لا مراجعة مستقلة للأصل", "No independent source review"),
  engine_text_conflicts_with_original: T(
    "نص المحرك يخالف معنى الأصل",
    "Engine text conflicts with the original meaning",
  ),
  locator_conflicts_with_independent_review: T(
    "صفحة المحرك تخالف صفحة المراجع",
    "Engine page conflicts with the independent review",
  ),
  original_locator_not_found: T("لم يُحدَّد موضع في الأصل", "No locator found in the original"),
  derived_figure_in_engine_text: T(
    "رقم مشتق في نص المحرك يُعرض كأنه منشور",
    "Derived figure presented as published in engine text",
  ),
  exact_date_unverified: T("اليوم الدقيق غير مثبت", "Exact day unverified"),
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
  quote_contains_disclosed_figure: T(
    "الاقتباس يتضمن رقمًا من نص الإفصاح؛ لا يُستخرج كقيمة",
    "Quote contains a figure from the disclosure text; not extracted as a value",
  ),
  same_event_multiple_records: T("الحدث نفسه في أكثر من سجل", "Same event in several records"),
  engine_excerpt_withheld_conflict: T(
    "نص المحرك محجوب عن الاقتباس لتعارضه مع الأصل",
    "Engine text withheld from quoting: conflicts with the original",
  ),
  composite_of_distinct_milestones: T(
    "سجل واحد يلخص مراحل مشاريع مختلفة",
    "One record summarising distinct project milestones",
  ),
};
const FIELD: Record<string, { ar: string; en: string }> = {
  stated_in_engine_quote_not_extracted: T(
    "مذكور في مقطع المحرك؛ لم يُستخرج قيمةً",
    "Stated in the engine excerpt; not extracted as a value",
  ),
  in_original_per_independent_review_not_extracted: T(
    "موجود في الأصل وفق المراجعة المستقلة؛ لم يُستخرج",
    "In the original per the independent review; not extracted",
  ),
  not_in_engine_record_original_unchecked: T(
    "غير مذكور في سجل المحرك؛ الأصل لم يُفحص (ليس «غير معلن»)",
    'Not in the engine record; original unchecked (not "undisclosed")',
  ),
};
const BASIS: Record<string, { ar: string; en: string }> = {
  single_record: T("سجل واحد", "Single record"),
  one_event_two_records: T("حدث واحد في سجلين", "One event, two records"),
  facets_of_one_note: T("أوجه إيضاح واحد", "Facets of one note"),
  facets_of_one_statement: T("أوجه بيان واحد", "Facets of one statement"),
  composite_of_distinct_milestones: T("ملخص مراحل مختلفة", "Composite of distinct milestones"),
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
  not_stated_in_record: T("غير مذكور في السجل", "Not stated in the record"),
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

/** R05: كل حقل متغير يُهرَّب، بما فيه التواريخ والسنوات. */
function effectText(e: EffectPeriod, l: L): string {
  const n = esc(e.note);
  switch (e.kind) {
    case "fiscal_year":
      return `${l === "ar" ? "السنة المالية" : "FY"} ${esc(e.fiscalYear)} · ${n}`;
    case "as_of":
      return `${l === "ar" ? "كما في" : "As of"} <span dir="ltr">${esc(e.date)}</span> · ${n}`;
    case "reporting_period":
      return `<span dir="ltr">${esc(e.start)} → ${esc(e.end)}</span> · ${n}`;
    case "through_year":
      return `${l === "ar" ? "حتى" : "Through"} ${esc(e.targetYear)}${e.baseYear ? (l === "ar" ? ` (أساس ${esc(e.baseYear)})` : ` (base ${esc(e.baseYear)})`) : ""} · ${n}`;
    case "term":
      return `${e.years ? `${esc(e.years)} ${l === "ar" ? "سنة" : "years"}` : `${esc(e.months)} ${l === "ar" ? "شهرًا" : "months"}`} · ${n}`;
    case "event_date":
      return `<span dir="ltr">${esc(e.date)}</span> · ${n}`;
    default:
      return `${l === "ar" ? "غير مذكور في السجل" : "Not stated in the record"} · ${n}`;
  }
}

function reviewText(c: ClaimRecord, l: L): string {
  const r = c.sourceReview;
  if (!r) return l === "ar" ? "لا مراجعة مستقلة" : "No independent review";
  const pages = r.reviewerPdfPages.length
    ? `PDF ${r.reviewerPdfPages.map(esc).join(", ")}`
    : l === "ar"
      ? "لا موضع محدد"
      : "no locator";
  return `<span data-review-status="${esc(r.status)}">${esc(r.status)}</span> · ${pages} · <span lang="en" dir="ltr">${esc(r.meaningConflict ?? r.derivationInEngineText ?? r.note)}</span> <small>(${l === "ar" ? "مراجعة معنى وموضع، لا اعتماد" : "meaning/locator review, not approval"})</small>`;
}

/** رابط إلى التطبيق المحلي؛ بلا قاعدة آمنة يُعرض نصًا لا رابطًا. */
function appLink(base: string | null, path: string, text: string, attr: string): string {
  return base
    ? `<a href="${esc(base + path)}" ${attr}>${text}</a>`
    : `<span data-link-disabled ${attr}>${text}</span>`;
}

function claimCard(c: ClaimRecord, l: L, base: string | null): string {
  const src = safeHref(c.evidence.url);
  const loc = [
    c.evidence.page !== null
      ? `${l === "ar" ? "ص (سجل المحرك)" : "p. (engine record)"} ${esc(c.evidence.page)}`
      : null,
    c.evidence.note ? `${l === "ar" ? "إيضاح" : "note"} ${esc(c.evidence.note)}` : null,
    c.evidence.table ? esc(c.evidence.table) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const conflict = c.engineExcerpt
    ? `<p data-excerpt-withheld class="warn">${l === "ar" ? "اقتُبس الجزء غير المتعارض فقط: بقية نص المحرك تخالف معنى الأصل وفق المراجعة المستقلة، فحُجبت. لم يُعدَّل المحرك." : "Only the non-conflicting part is quoted: the rest of the engine text conflicts with the original per the independent review and is withheld. The engine is not modified."}</p><p class="warn" lang="ar" dir="rtl">${esc(c.engineExcerpt.conflict)}</p>`
    : "";
  const quote =
    c.quote !== null
      ? `<blockquote lang="en" dir="ltr" data-quote>${esc(c.quote)}</blockquote><p class="lang">${l === "ar" ? "مقطع حرفي من نص المحرك في اللقطة المجمدة؛ لم يُطابَق حرفيًا مع المستند الأصلي" : "Verbatim excerpt of the frozen engine text; not verified verbatim against the original document"}</p>${conflict}`
      : `<p data-no-quote>${l === "ar" ? "لا اقتباس: النص يحمل أرقام القوائم المالية، وهي معروضة في Marefa Data." : "No quote: the text carries financial-statement figures, which are shown in Marefa Data."}</p>`;
  return `<article class="card" id="c-${esc(c.id)}" data-claim="${esc(c.id)}" data-category="${esc(c.category)}" data-status="${esc(c.qualification.status)}">
<header><span class="badge cat-${esc(c.category)}">${label(CATEGORY, c.category, l)}${c.planKind ? ` · ${label(PLAN, c.planKind, l)}` : ""}</span>
<span class="badge withheld">WITHHELD · ${l === "ar" ? "غير مؤهل للنشر" : "not eligible for publication"}</span>
<span class="type">${label(EVENT, c.eventType, l)}</span></header>
${quote}
<dl>
<dt>${l === "ar" ? "نُشر المصدر" : "Source published"}</dt><dd dir="ltr">${esc(c.evidence.filedAt)}</dd>
<dt>${l === "ar" ? "فترة الأثر" : "Effect period"}</dt><dd>${effectText(c.effect, l)}</dd>
<dt>${l === "ar" ? "المصدر" : "Source"}</dt><dd>${src ? `<a href="${src}" rel="noopener noreferrer" data-source>${esc(c.evidence.filingType)}</a>` : esc(c.evidence.filingType)}${loc ? ` · ${loc}` : ""}${c.evidence.pdfSha256 ? ` · <code title="WEB-08B02">PDF sha256 ${esc(c.evidence.pdfSha256.slice(0, 12))}…</code>` : ""}</dd>
<dt>${l === "ar" ? "المراجعة المستقلة للأصل" : "Independent source review"}</dt><dd data-source-review>${reviewText(c, l)}</dd>
</dl>
<p class="gaps" data-gaps>${l === "ar" ? "ما ينقص للتأهيل:" : "Missing for qualification:"} ${c.qualification.gaps.map((g) => `<span class="gap">${label(GAP, g, l)}</span>`).join(" ")}</p>
${c.qualification.warnings.length ? `<p class="warn" data-warnings>${c.qualification.warnings.map((w) => label(WARN, w, l)).join(" · ")}</p>` : ""}
${c.override ? `<p class="warn" data-override>${esc(c.override)}</p>` : ""}
<nav class="links">${appLink(base, c.links.intelligence, l === "ar" ? "تحليل الشركة ←" : "Company Intelligence →", "data-link-intelligence")} ${appLink(base, c.links.marefaData, l === "ar" ? "بيانات معرفة ←" : "Marefa Data →", "data-link-marefa")}</nav>
</article>`;
}

function fieldCell(f: ProjectRecord["capacity"], l: L, head: string): string {
  const detail =
    f.status === "stated_in_engine_quote_not_extracted"
      ? ` <small><bdi dir="ltr">(${esc(f.claimId)})</bdi></small>`
      : f.status === "in_original_per_independent_review_not_extracted"
        ? ` <small><bdi dir="ltr">(PDF ${f.pdfPages.map(esc).join(", ")})</bdi></small>`
        : "";
  return `<td data-label="${esc(head)}" data-field-status="${esc(f.status)}">${label(FIELD, f.status, l)}${detail}</td>`;
}

export function renderWorkspace(r: Register, l: L, appBase: string): string {
  const t = (x: { ar: string; en: string }) => esc(x[l]);
  const base = safeAppBase(appBase);
  const byTopic = new Map(r.topicMap.map((x) => [x.topic, x]));
  const claimById = new Map(r.claims.map((c) => [c.id, c]));
  const groups = GROUPS.map((g) => {
    const topics = g.topics
      .map((topic) => {
        const m = byTopic.get(topic)!;
        const cards = m.claims.map((id) => claimCard(claimById.get(id)!, l, base)).join("");
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
        return `<section id="topic-${esc(topic)}" data-topic="${esc(topic)}" data-topic-status="${esc(m.status)}"><h3>${label(TOPIC_TITLE, topic, l)} <small>(${m.claims.length})</small></h3>${empty}${cards}${cross}${docs}</section>`;
      })
      .join("");
    return `<section class="group" id="group-${g.id}" data-group="${g.id}"><h2>${t(g.title)}</h2>${topics}</section>`;
  }).join("");

  const H = {
    project: l === "ar" ? "المشروع" : "Project",
    status: l === "ar" ? "الحالة" : "Status",
    capacity: l === "ar" ? "السعة" : "Capacity",
    timing: l === "ar" ? "التوقيت" : "Timing",
    cost: l === "ar" ? "التكلفة" : "Cost",
    metrics: l === "ar" ? "مؤشرات منشورة ذات صلة" : "Related published indicators",
    drivers: l === "ar" ? "المحركات الاقتصادية" : "Economic drivers",
  };
  const projects = `<section id="projects" data-projects><h2>${l === "ar" ? "نموذج المشاريع" : "Project model"}</h2>
<p class="lang">${l === "ar" ? "لا قيمة مستخرجة في أي حقل. «غير مذكور في سجل المحرك» لا يعني أن المُصدر لم يفصح." : 'No field holds an extracted value. "Not in the engine record" does not mean the issuer did not disclose it.'}</p>
<table class="stack"><thead><tr>${Object.values(H)
    .map((h) => `<th>${esc(h)}</th>`)
    .join("")}</tr></thead><tbody>
${r.projects
  .map(
    (
      p,
    ) => `<tr data-project="${esc(p.id)}"><td data-label="${esc(H.project)}"><b>${esc(p.name)}</b><br><small>${p.description.map((d) => `${d.quote !== null ? `<span lang="en" dir="ltr">“${esc(d.quote)}”</span>` : ""}${d.withheld ? ` <span data-excerpt-withheld>(${l === "ar" ? "الجزء المتعارض من نص المحرك محجوب" : "conflicting part of the engine text withheld"})</span>` : ""}`).join("<br>")}</small></td>
<td data-label="${esc(H.status)}" data-execution-status="${esc(p.executionStatus.state)}">${label(STATUS, p.executionStatus.state, l)}</td>
${fieldCell(p.capacity, l, H.capacity)}
${fieldCell(p.timing, l, H.timing)}
${fieldCell(p.cost, l, H.cost)}
<td data-label="${esc(H.metrics)}">${p.relatedEngineMetrics.map((m) => (m.presentInSnapshot ? appLink(base, `/preview/web-v1/companies/${encodeURIComponent(r.company.symbol)}/intelligence?topic=operations&focus=${encodeURIComponent(m.key)}`, esc(m.key), "data-metric") : esc(m.key))).join(", ")}</td>
<td data-label="${esc(H.drivers)}" data-not-authored>${l === "ar" ? "غير مؤلَّفة: تحتاج منهجية ومراجعة معتمدتين" : "Not authored: needs an approved methodology and review"}</td></tr>`,
  )
  .join("")}
</tbody></table></section>`;

  const rg = r.riskGuidance.categories;
  const register = `<section id="risk-guidance" data-risk-guidance><h2>${l === "ar" ? "سجل المخاطر والتوجيهات" : "Risk and guidance register"}</h2>
<div class="grid">${(Object.keys(rg) as Category[])
    .map(
      (k) =>
        `<div class="cell" data-register-category="${k}"><b>${t(CATEGORY[k])}</b> <span class="n">${rg[k].length}</span><p>${esc(r.riskGuidance.notes[k])}</p><ul>${rg[k].map((id) => `<li><a href="#c-${esc(id)}">${esc(id)}</a></li>`).join("")}</ul></div>`,
    )
    .join("")}</div></section>`;

  const E = {
    id: l === "ar" ? "المجموعة" : "Group",
    type: l === "ar" ? "النوع" : "Type",
    basis: l === "ar" ? "أساس التجميع" : "Grouping basis",
    first: l === "ar" ? "أول دليل" : "First evidence",
    records: l === "ar" ? "السجلات" : "Records",
    topic: l === "ar" ? "الموضوع" : "Topic",
    linked: l === "ar" ? "علاقة معلنة" : "Declared link",
  };
  const events = `<section id="events" data-events><h2>${l === "ar" ? "سجل مجموعات الأحداث" : "Event-group register"} <small>(${r.events.length})</small></h2>
<p class="lang">${l === "ar" ? "كل صف مجموعة سجلات منسقة، لا حدث اقتصادي مستقل مثبت." : "Each row is a curated record group, not an independently verified economic event."}</p>
<table class="stack"><thead><tr>${Object.values(E)
    .map((h) => `<th>${esc(h)}</th>`)
    .join("")}</tr></thead><tbody>
${r.events.map((e) => `<tr data-event="${esc(e.eventId)}" data-basis="${esc(e.basis)}"><td data-label="${esc(E.id)}">${esc(e.eventId)}</td><td data-label="${esc(E.type)}">${label(EVENT, e.eventType, l)}</td><td data-label="${esc(E.basis)}">${label(BASIS, e.basis, l)}</td><td data-label="${esc(E.first)}" dir="ltr">${esc(e.firstEvidenceFiledAt)}</td><td data-label="${esc(E.records)}">${e.records.length}</td><td data-label="${esc(E.topic)}">${label(TOPIC_TITLE, e.topic, l)}</td><td data-label="${esc(E.linked)}">${e.linked.length ? e.linked.map((x) => `<span data-linked="${esc(x.eventId)}">${esc(x.eventId)} — ${l === "ar" ? "قد يكونان إجراءً واحدًا؛ لم يُدمجا دون قرار" : "possibly one corporate action; not merged without a decision"}</span>`).join("<br>") : "—"}</td></tr>`).join("")}
</tbody></table></section>`;

  const D = {
    series: l === "ar" ? "السلسلة" : "Series",
    edition: l === "ar" ? "الإصدار" : "Edition",
    filed: l === "ar" ? "النشر" : "Filed",
    sha: "PDF sha256",
    records: l === "ar" ? "سجلات مصدر في المحرك" : "Engine source records",
    snap: l === "ar" ? "في اللقطة" : "In snapshot",
  };
  const documents = `<section id="documents" data-documents><h2>${l === "ar" ? "سجل الوثائق وإصداراتها" : "Document and edition register"} <small>(${r.documents.length})</small></h2>
<p class="lang">${l === "ar" ? "صفوف تقارير وإصدارات وصفحة فهرس التداول؛ ليست كلها ملفات PDF مثبتة." : "Report and edition rows plus the exchange catalogue page; not all are pinned PDFs."}</p>
<table class="stack"><thead><tr>${Object.values(D)
    .map((h) => `<th>${esc(h)}</th>`)
    .join("")}</tr></thead><tbody>
${r.documents.map((d) => `<tr data-document="${esc(d.artifactUrl)}"><td data-label="${esc(D.series)}">${esc(d.family)}</td><td data-label="${esc(D.edition)}">${safeHref(d.artifactUrl) ? `<a href="${safeHref(d.artifactUrl)}" rel="noopener noreferrer">${esc(d.editions.join(", ") || d.artifactUrl.split("/").pop() || "")}</a>` : esc(d.artifactUrl)}</td><td data-label="${esc(D.filed)}" dir="ltr">${esc(d.firstFiledAt)}</td><td data-label="${esc(D.sha)}">${d.pdfSha256 ? `<code>${esc(d.pdfSha256.slice(0, 12))}…</code> (B02)` : l === "ar" ? "غير مثبتة" : "not pinned"}</td><td data-label="${esc(D.records)}">${d.sourceRecords.length}</td><td data-label="${esc(D.snap)}">${d.inEngineSnapshot ? (l === "ar" ? "نعم" : "yes") : l === "ar" ? "لا (B02 فقط)" : "no (B02 only)"}</td></tr>`).join("")}
</tbody></table></section>`;

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
table{border-collapse:collapse;width:100%;font-size:.85rem} th,td{border-bottom:1px solid var(--line);padding:.45rem;text-align:start;vertical-align:top;overflow-wrap:normal;word-break:normal}
@media (max-width:760px){table.stack thead{display:none}table.stack tr{display:block;border:1px solid var(--line);border-radius:.6rem;margin:.6rem 0;padding:.3rem .6rem;background:var(--card)}table.stack td{display:block;border:0;padding:.25rem 0}table.stack td::before{content:attr(data-label);display:block;color:var(--muted);font-size:.75rem}}
.banner .bad{color:var(--bad)}
.grid{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))} .cell{background:var(--card);border:1px solid var(--line);border-radius:.75rem;padding:.75rem}
.n{font-size:1.2rem;font-weight:700} nav.top{display:flex;flex-wrap:wrap;gap:.75rem;margin:.5rem 0}
</style></head><body><main>
<aside class="banner" role="note" data-banner><b>${l === "ar" ? "عينة بحثية غير معتمدة — محلية فقط — لا تُنشر" : "Unapproved research sample — local only — not for publication"}</b><br>${l === "ar" ? "كل الادعاءات WITHHELD وفق عقد WEB-08B01. مقاطع حرفية من نص المحرك المجمد، لا من المستندات الأصلية (لقطة " : "All claims are WITHHELD under the WEB-08B01 contract. Verbatim excerpts of the frozen engine text, not of the original documents (snapshot "}<span dir="ltr">${esc(r.snapshot.generatedAt)}</span>)${l === "ar" ? "؛ لا توقعات ولا تقييم ولا رأي بحثي ولا قيم مالية مخزنة." : "; no forecasts, valuation, research opinion or stored financial values."}</aside>
${base ? "" : `<aside class="banner" role="alert" data-app-base-rejected><b class="bad">${l === "ar" ? "APP_BASE مرفوض: يُقبل http(s) على loopback فقط. روابط التطبيق معطلة." : "APP_BASE rejected: only http(s) on loopback is allowed. App links are disabled."}</b></aside>`}
<h1>${l === "ar" ? "أرامكو السعودية — الإفصاحات في بنية تحليل الشركة" : "Saudi Aramco — disclosures in the Company Intelligence structure"}</h1>
<nav class="top" aria-label="sections"><a href="?lang=${l === "ar" ? "en" : "ar"}" data-lang-toggle>${l === "ar" ? "English" : "العربية"}</a><a href="#projects">${l === "ar" ? "المشاريع" : "Projects"}</a><a href="#risk-guidance">${l === "ar" ? "المخاطر والتوجيهات" : "Risks and guidance"}</a><a href="#events">${l === "ar" ? "الأحداث" : "Events"}</a><a href="#documents">${l === "ar" ? "الوثائق" : "Documents"}</a>${appLink(base, `/preview/web-v1/companies/${encodeURIComponent(r.company.symbol)}?tab=financials`, l === "ar" ? "القوائم المالية في Marefa Data" : "Financial statements in Marefa Data", "data-marefa-data")}</nav>
${groups}${projects}${register}${events}${documents}
</main></body></html>`;
}

export function createDemoServer(appBase = process.env["APP_BASE"] ?? "http://127.0.0.1:5173") {
  // R05: إعداد غير آمن يُرفض عند التشغيل بدل إنشاء روابط منه.
  if (!safeAppBase(appBase))
    throw Error("unsafe_app_base: only http(s) loopback origins are allowed");
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
