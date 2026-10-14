import type { LocalizedText } from "@/lib/i18n";
import { normalize } from "./catalog";

/**
 * WEB-05C: الأبحاث ومكتبة المعرفة. منطق خالص (بلا شبكة):
 * - تطبيع صفوف المحتوى المنشور (جدولا research وknowledge_articles) تطبيعًا دفاعيًا: أي حقل غائب يبقى غائبًا،
 *   ولا يُملأ بنص أو مؤلف أو تاريخ أو رقم.
 * - تحويل نص القسم إلى كتل قراءة (فقرات، قوائم، جداول بصيغة الأعمدة |، اقتباسات، عناوين فرعية) دون HTML.
 * - البحث والتصفية والترتيب والمحتوى ذو الصلة من الحقول الموثقة فقط (القطاع، الوسوم، التصنيف).
 * لا رابط إلى شركة إلا من حقل صريح؛ الجدول الحالي لا يحمل هذا الحقل.
 */

// ───────────────────────── أنواع العرض

export type Lang = "ar" | "en";
export type Text = { ar: string | null; en: string | null };

export type Reference = { index: number; text: string; url: string | null };

export type Section = { id: string; heading: Text; body: Text };

export type ResearchItem = {
  slug: string;
  title: Text;
  summary: Text;
  author: Text;
  authorRole: Text;
  /** كما في المحتوى؛ null إن لم يُذكر (لا يُحسب). */
  readingTime: number | null;
  publishedAt: string | null;
  /** valid = تاريخ صحيح؛ missing = غائب في المصدر؛ invalid = موجود لكنه مستحيل أو بصيغة غير مدعومة. */
  dateStatus: DateStatus;
  tags: Text[];
  /** القطاع كما في محتوى الموقع (جدول sectors في Supabase)، لا تصنيف المحرك. */
  sectorSlug: string | null;
  sectorName: Text;
  sections: Section[];
  references: Reference[];
};

export type KnowledgeItem = {
  slug: string;
  title: Text;
  summary: Text;
  category: Text;
  level: Text;
  readingTime: number | null;
  sections: Section[];
  videos: { title: Text; duration: string | null; url: string | null }[];
};

/** حالة مصدر المحتوى: لا تُعرض قائمة فارغة كأنها "لا محتوى" حين يكون المصدر غير متاح. */
export type LibraryState<T> =
  | { state: "ok"; data: T }
  | { state: "unavailable"; reason: LocalizedText }
  | { state: "error"; reason: LocalizedText }
  | { state: "not_found" };

// ───────────────────────── تطبيع دفاعي

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export function text(v: unknown): Text {
  if (typeof v === "string") return { ar: str(v), en: null };
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ar: null, en: null };
  const o = v as Record<string, unknown>;
  return { ar: str(o["ar"]), en: str(o["en"]) };
}

export const hasText = (t: Text) => Boolean(t.ar || t.en);

/** النص باللغة المطلوبة، أو باللغة الأخرى مع علامة بأنه ليس ترجمة (لا ترجمة آلية). */
export function pick(
  t: Text,
  lang: Lang,
): { value: string | null; lang: Lang | null; fallback: boolean } {
  const other: Lang = lang === "ar" ? "en" : "ar";
  if (t[lang]) return { value: t[lang], lang, fallback: false };
  if (t[other]) return { value: t[other], lang: other, fallback: true };
  return { value: null, lang: null, fallback: false };
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

export type DateStatus = "valid" | "missing" | "invalid";

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * WEB-05C (إصلاح القبول): تاريخ النشر كما يرسله العقد الحالي: YYYY-MM-DD وحده، أو متبوعًا بوقت
 * (T أو مسافة، كما في timestamptz). يُتحقق من التقويم فعليًا (الشهر 1–12، واليوم حسب الشهر والسنة الكبيسة).
 * لا يُعتمد على Date.parse: فهو يحوّل 2026-02-31 إلى 2026-03-03 بصمت. التاريخ المستحيل لا يُصحَّح ولا
 * يُستبدل: يصبح "invalid" بلا قيمة، والغائب "missing" بلا قيمة.
 */
export function dateOf(v: unknown): { value: string | null; status: DateStatus } {
  const s = str(v);
  if (!s) return { value: null, status: "missing" };
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ]\d{2}:\d{2})/.exec(s);
  if (!m) return { value: null, status: "invalid" };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const max = mo === 2 && isLeap(y) ? 29 : (DAYS[mo - 1] ?? 0);
  if (y < 1 || mo < 1 || mo > 12 || d < 1 || d > max) return { value: null, status: "invalid" };
  return { value: `${m[1]}-${m[2]}-${m[3]}`, status: "valid" };
}

/** رابط http(s) بلا بيانات اعتماد فقط؛ غير ذلك لا يصبح رابطًا. */
export function safeUrl(raw: unknown): string | null {
  const s = str(raw);
  if (!s) return null;
  try {
    const u = new URL(s);
    if ((u.protocol !== "https:" && u.protocol !== "http:") || u.username || u.password)
      return null;
    return u.href;
  } catch {
    return null;
  }
}

/** معرّف قسم ثابت وآمن للروابط الداخلية (#). */
const anchor = (raw: unknown, i: number) => {
  const s = str(raw)
    ?.toLowerCase()
    .replace(/[^a-z0-9؀-ۿ_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s ? `s-${s}` : `s-${i + 1}`;
};

function sections(v: unknown): Section[] {
  const out: Section[] = [];
  const seen = new Set<string>();
  arr(v).forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return;
    const o = raw as Record<string, unknown>;
    const s = { heading: text(o["heading"]), body: text(o["body"]) };
    if (!hasText(s.heading) && !hasText(s.body)) return;
    let id = anchor(o["id"], i);
    while (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    out.push({ id, ...s });
  });
  return out;
}

/** المراجع كما وردت: نص المرجع، ورابط إن كان المرجع نفسه رابطًا آمنًا أو انتهى برابط آمن. */
export function references(v: unknown): Reference[] {
  return arr(v)
    .map(str)
    .filter((s): s is string => Boolean(s))
    .map((s, i) => {
      const direct = safeUrl(s);
      const tail = direct ? null : /(https?:\/\/\S+)$/.exec(s);
      return {
        index: i + 1,
        text: s,
        url: direct ?? (tail ? safeUrl(tail[1]!.replace(/[).,]+$/, "")) : null),
      };
    });
}

export function normalizeResearch(row: unknown): ResearchItem | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const slug = str(r["slug"]);
  const title = text(r["title"]);
  if (!slug || !hasText(title)) return null;
  const published = dateOf(r["published_at"]);
  const sector =
    r["sectors"] && typeof r["sectors"] === "object"
      ? (r["sectors"] as Record<string, unknown>)
      : null;
  return {
    slug,
    title,
    summary: text(r["summary"]),
    author: text(r["author"]),
    authorRole: text(r["author_role"]),
    readingTime: num(r["reading_time"]),
    publishedAt: published.value,
    dateStatus: published.status,
    tags: arr(r["tags"]).map(text).filter(hasText),
    sectorSlug: str(sector?.["slug"]),
    sectorName: text(sector?.["name"]),
    sections: sections(r["sections"]),
    references: references(r["refs"]),
  };
}

export function normalizeKnowledge(row: unknown): KnowledgeItem | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const slug = str(r["slug"]);
  const title = text(r["title"]);
  if (!slug || !hasText(title)) return null;
  return {
    slug,
    title,
    summary: text(r["summary"]),
    category: text(r["category"]),
    level: text(r["level"]),
    readingTime: num(r["reading_time"]),
    sections: sections(r["sections"]),
    videos: arr(r["videos"])
      .map((x) => {
        const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
        return { title: text(o["title"]), duration: str(o["duration"]), url: safeUrl(o["url"]) };
      })
      .filter((x) => hasText(x.title)),
  };
}

// ───────────────────────── نص القسم → كتل قراءة

export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  /**
   * جدول لا تطابق صفوفه عدد أعمدة رأسه: لا يُعرض جدولًا، ولا تُقصّ خلية ولا تُضاف. يُحفظ النص الأصلي كاملًا
   * بترتيبه (أسطر الجدول كما وردت) مع عدد أعمدة الرأس وعدد خلايا كل سطر للتنبيه.
   */
  | { type: "table_mismatch"; text: string; header: number; widths: number[] };

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
const isSeparator = (line: string) =>
  /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());

/**
 * يقسّم النص إلى كتل. نص بلا أي صيغة يبقى فقرات كما هو. لا HTML ولا روابط مضمّنة: يُعرض نصًا فقط.
 * الجدول: أسطر متتالية تبدأ بـ "|"، والسطر الأول رأس الجدول، وسطر الفاصل (---) اختياري.
 * إن اختلف عدد خلايا أي سطر عن الرأس: كتلة table_mismatch بالنص الأصلي كاملًا، لا جدول مقصوص أو مكمّل.
 */
export function parseBody(input: string | null): Block[] {
  if (!input) return [];
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const t = line.trim();
    if (!t) {
      flush();
      continue;
    }
    if (t.startsWith("|")) {
      flush();
      const raw: string[] = [];
      const rows: string[][] = [];
      const widths: number[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) {
        raw.push(lines[i]!);
        const c = cells(lines[i]!);
        widths.push(c.length);
        if (!isSeparator(lines[i]!)) rows.push(c);
        i++;
      }
      i--;
      const [header, ...body] = rows;
      if (header) {
        // كل سطر (ومنه سطر الفاصل) يجب أن يطابق عدد أعمدة الرأس، وإلا فالبنية لا تطابق المصدر.
        if (widths.every((w) => w === header.length))
          blocks.push({ type: "table", header, rows: body });
        else
          blocks.push({
            type: "table_mismatch",
            text: raw.join("\n"),
            header: header.length,
            widths,
          });
      }
      continue;
    }
    const bullet = /^[-•*]\s+(.*)$/.exec(t);
    const ordered = /^(\d+)[.)]\s+(.*)$/.exec(t);
    if (bullet || ordered) {
      flush();
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (i < lines.length) {
        const m = isOrdered
          ? /^\d+[.)]\s+(.*)$/.exec(lines[i]!.trim())
          : /^[-•*]\s+(.*)$/.exec(lines[i]!.trim());
        if (!m) break;
        items.push(m[1]!);
        i++;
      }
      i--;
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }
    if (/^#{2,4}\s+/.test(t)) {
      flush();
      blocks.push({ type: "h", text: t.replace(/^#{2,4}\s+/, "") });
      continue;
    }
    if (t.startsWith("> ")) {
      flush();
      blocks.push({ type: "quote", text: t.slice(2) });
      continue;
    }
    para.push(t);
  }
  flush();
  return blocks;
}

/** خلية جدول رقمية؟ (لمحاذاة الأرقام واتجاهها فقط؛ لا تُحسب ولا يُعاد تنسيقها). */
export const isNumericCell = (s: string) => /^[-+−(]?[\d٠-٩][\d٠-٩,.\s٬٫]*%?\)?$/.test(s.trim());

// ───────────────────────── البحث والتصفية

const matches = (q: string, ...values: Text[]) => {
  const nq = normalize(q);
  if (!nq) return true;
  return values.some((v) => [v.ar, v.en].some((s) => s && normalize(s).includes(nq)));
};

/** مفتاح ثابت لنص مترجم (للتصنيف والوسم): الإنجليزي إن وُجد وإلا العربي، مطبّعًا. */
export const keyOf = (t: Text) => normalize(t.en ?? t.ar ?? "").replace(/\s+/g, "-");

export type ResearchQuery = {
  q: string;
  sector: string;
  tag: string;
  sort: "newest" | "oldest";
};
export const RESEARCH_DEFAULTS: ResearchQuery = {
  q: "",
  sector: "all",
  tag: "all",
  sort: "newest",
};

export function queryResearch(items: readonly ResearchItem[], query: ResearchQuery) {
  const rows = items
    .filter((r) => matches(query.q, r.title, r.summary, ...r.tags))
    .filter((r) => query.sector === "all" || r.sectorSlug === query.sector)
    .filter((r) => query.tag === "all" || r.tags.some((t) => keyOf(t) === query.tag));
  const dir = query.sort === "oldest" ? 1 : -1;
  // بلا تاريخ في آخر القائمة دائمًا (لا يُفترض تاريخ).
  return [...rows].sort((a, b) =>
    a.publishedAt === b.publishedAt
      ? a.slug.localeCompare(b.slug)
      : !a.publishedAt
        ? 1
        : !b.publishedAt
          ? -1
          : dir * a.publishedAt.localeCompare(b.publishedAt),
  );
}

export function researchFacets(items: readonly ResearchItem[]) {
  const sectors = new Map<string, number>();
  const tags = new Map<string, { label: Text; count: number }>();
  for (const r of items) {
    if (r.sectorSlug) sectors.set(r.sectorSlug, (sectors.get(r.sectorSlug) ?? 0) + 1);
    for (const t of r.tags) {
      const k = keyOf(t);
      tags.set(k, { label: tags.get(k)?.label ?? t, count: (tags.get(k)?.count ?? 0) + 1 });
    }
  }
  return {
    sectors: [...sectors]
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug)),
    tags: [...tags]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
  };
}

export type KnowledgeQuery = { q: string; category: string; level: string };
export const KNOWLEDGE_DEFAULTS: KnowledgeQuery = { q: "", category: "all", level: "all" };

export function queryKnowledge(items: readonly KnowledgeItem[], query: KnowledgeQuery) {
  return items
    .filter((k) => matches(query.q, k.title, k.summary, k.category))
    .filter((k) => query.category === "all" || keyOf(k.category) === query.category)
    .filter((k) => query.level === "all" || keyOf(k.level) === query.level);
}

/** دليل الموضوعات: المقالات مجمّعة بتصنيفها كما ورد (بترتيب ظهورها في المصدر). بلا تصنيف = مجموعة مستقلة. */
export function knowledgeGroups(items: readonly KnowledgeItem[]) {
  const groups = new Map<string, { key: string; label: Text | null; items: KnowledgeItem[] }>();
  for (const k of items) {
    const key = hasText(k.category) ? keyOf(k.category) : "uncategorized";
    const g = groups.get(key) ?? { key, label: hasText(k.category) ? k.category : null, items: [] };
    g.items.push(k);
    groups.set(key, g);
  }
  return [...groups.values()];
}

export function knowledgeFacets(items: readonly KnowledgeItem[]) {
  const levels = new Map<string, { label: Text; count: number }>();
  for (const k of items)
    if (hasText(k.level)) {
      const key = keyOf(k.level);
      levels.set(key, {
        label: levels.get(key)?.label ?? k.level,
        count: (levels.get(key)?.count ?? 0) + 1,
      });
    }
  return {
    categories: knowledgeGroups(items).map((g) => ({
      key: g.key,
      label: g.label,
      count: g.items.length,
    })),
    levels: [...levels].map(([key, v]) => ({ key, ...v })),
  };
}

// ───────────────────────── ذو صلة (من الحقول الموثقة فقط)

/** أبحاث ذات صلة: نفس القطاع أو وسم مشترك، الأحدث أولًا. لا "ذو صلة" بالتخمين. */
export function relatedResearch(item: ResearchItem, all: readonly ResearchItem[], limit = 3) {
  const tags = new Set(item.tags.map(keyOf));
  return queryResearch(
    all.filter(
      (r) =>
        r.slug !== item.slug &&
        ((item.sectorSlug && r.sectorSlug === item.sectorSlug) ||
          r.tags.some((t) => tags.has(keyOf(t)))),
    ),
    RESEARCH_DEFAULTS,
  ).slice(0, limit);
}

/** موضوعات ذات صلة: نفس التصنيف كما ورد في المصدر. */
export function relatedKnowledge(item: KnowledgeItem, all: readonly KnowledgeItem[], limit = 4) {
  if (!hasText(item.category)) return [];
  const key = keyOf(item.category);
  return all.filter((k) => k.slug !== item.slug && keyOf(k.category) === key).slice(0, limit);
}

/** هل يتوفر المقال كاملًا بلغة الواجهة؟ (العنوان وكل الأقسام). وإلا يُعرض بلغته مع تنبيه، لا بترجمة آلية. */
export function languageCoverage(item: { title: Text; sections: Section[] }, lang: Lang) {
  const parts = [item.title, ...item.sections.flatMap((s) => [s.heading, s.body]).filter(hasText)];
  const missing = parts.filter((p) => !p[lang]).length;
  return { complete: missing === 0, missing, total: parts.length };
}

// ───────────────────────── نصوص مشتركة

export const LIBRARY_COPY = {
  frozen: {
    ar: "لا توجد عينة موثقة من الأبحاث أو المقالات في معاينة التصميم المجمّدة. مصدرها محتوى الموقع المنشور (Supabase)، ويُعرض هنا عند تشغيل المعاينة على المحتوى الحي.",
    en: "There is no documented sample of research or articles in the frozen design preview. Their source is the published site content (Supabase); it appears here when the preview runs against live content.",
  },
  error: {
    ar: "تعذّر الوصول إلى محتوى الموقع الآن. لم يُعرض أي محتوى بديل.",
    en: "The site content could not be reached right now. No substitute content is shown.",
  },
  noCompanyLink: {
    ar: "لا يحمل البحث ارتباطًا موثقًا بشركة: جدول الأبحاث الحالي يربط البحث بقطاع فقط، ولا نستنتج الشركات من النص.",
    en: "This research carries no documented link to a company: the current research table links research to a sector only, and we do not infer companies from the text.",
  },
  fallback: {
    ar: "هذا الجزء غير متوفر بالعربية في المصدر؛ يُعرض بلغته الأصلية دون ترجمة آلية.",
    en: "This part is not available in English in the source; it is shown in its original language without machine translation.",
  },
} as const satisfies Record<string, LocalizedText>;
