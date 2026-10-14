import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, BookOpen, CircleSlash, ExternalLink, Languages, List } from "lucide-react";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import {
  isNumericCell,
  LIBRARY_COPY,
  parseBody,
  pick,
  type Block,
  type Lang,
  type Reference,
  type Section,
  type Text,
} from "@/lib/web-v1/library";

/**
 * WEB-05C: مكونات القراءة المشتركة بين الأبحاث والمعرفة: نص محلي بلغته (مع تنبيه حين يكون بغير لغة
 * الواجهة)، وكتل المقال (فقرات، جداول قابلة للتمرير داخلها فقط، قوائم، اقتباسات)، وجدول المحتويات،
 * والمراجع، وحالات التحميل والنقص والخطأ.
 */

export function useLang(): Lang {
  return useI18n().locale === "en" ? "en" : "ar";
}

/** نص من المحتوى بلغته. إن لم يتوفر بلغة الواجهة يُعرض بلغته الأصلية مع dir صحيح، ولا يُترجم. */
export function L({
  t,
  as: As = "span",
  className,
  empty = null,
}: {
  t: Text;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  className?: string;
  empty?: ReactNode;
}) {
  const p = pick(t, useLang());
  if (!p.value) return <>{empty}</>;
  return (
    <As
      className={className}
      lang={p.lang ?? undefined}
      dir={p.lang === "ar" ? "rtl" : "ltr"}
      data-fallback={p.fallback || undefined}
    >
      {p.value}
    </As>
  );
}

// ───────────────────────── حالات

export function LibraryStateView({
  kind,
  reason,
  title,
}: {
  kind: "unavailable" | "error" | "empty" | "not_found";
  reason?: LocalizedText;
  title?: LocalizedText;
}) {
  const { t } = useI18n();
  const Icon = kind === "error" ? AlertTriangle : CircleSlash;
  const heading =
    title ??
    {
      unavailable: {
        ar: "المحتوى غير متاح في هذه المعاينة",
        en: "Content not available in this preview",
      },
      error: { ar: "تعذّر تحميل المحتوى", en: "Could not load the content" },
      empty: { ar: "لا محتوى منشور بعد", en: "Nothing published yet" },
      not_found: { ar: "غير موجود أو غير منشور", en: "Not found or not published" },
    }[kind];
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed p-8 text-center sm:p-10",
        kind === "error" ? "border-status-bad/40 bg-status-bad/5" : "border-border bg-card/60",
      )}
      data-library-state={kind}
      role={kind === "error" ? "alert" : "status"}
    >
      <Icon
        className={cn(
          "mx-auto size-6",
          kind === "error" ? "text-status-bad" : "text-muted-foreground",
        )}
      />
      <p className="mt-3 text-[15px] font-semibold">{t(heading)}</p>
      {reason && (
        <p className="mx-auto mt-1.5 max-w-xl text-[13px] leading-6 text-muted-foreground">
          {t(reason)}
        </p>
      )}
      {kind === "error" && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg border border-border px-3 py-1.5 text-[12px] hover:bg-muted"
          data-retry
        >
          {t({ ar: "إعادة المحاولة", en: "Try again" })}
        </button>
      )}
    </div>
  );
}

/** هيكل التحميل: يحجز مكان البطاقات دون أي نص أو رقم. */
export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-library-loading aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="animate-pulse rounded-2xl border border-border/70 bg-card p-5">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="mt-4 h-4 w-4/5 rounded bg-muted" />
          <div className="mt-2 h-4 w-3/5 rounded bg-muted" />
          <div className="mt-5 h-3 w-full rounded bg-muted/70" />
          <div className="mt-2 h-3 w-11/12 rounded bg-muted/70" />
        </li>
      ))}
    </ul>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="animate-pulse space-y-4" data-library-loading aria-busy="true">
      <div className="h-7 w-2/3 rounded bg-muted" />
      <div className="h-4 w-1/3 rounded bg-muted/70" />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={cn("h-3 rounded bg-muted/70", i % 3 === 2 ? "w-3/4" : "w-full")} />
      ))}
    </div>
  );
}

// ───────────────────────── بنية المقال

/** جدول المحتويات: عمود ثابت على الكمبيوتر، وقائمة قابلة للطي على الجوال. */
export function Toc({
  sections,
  extra = [],
}: {
  sections: Section[];
  extra?: { id: string; label: LocalizedText }[];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const items = (
    <ol className="space-y-1 text-[13px]">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            onClick={() => setOpen(false)}
            className="flex gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            data-toc-link={s.id}
          >
            <span className="num w-5 shrink-0 text-[11px] text-brand">{iso(i + 1)}</span>
            <L t={s.heading} empty={t({ ar: `القسم ${i + 1}`, en: `Section ${i + 1}` })} />
          </a>
        </li>
      ))}
      {extra.map((x) => (
        <li key={x.id}>
          <a
            href={`#${x.id}`}
            onClick={() => setOpen(false)}
            className="flex gap-2 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            data-toc-link={x.id}
          >
            <span className="w-5 shrink-0" />
            {t(x.label)}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <nav
        className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto lg:block"
        aria-label={t({ ar: "المحتويات", en: "Contents" })}
        data-toc
      >
        <div className="mb-2 px-2 text-[11px] font-semibold text-muted-foreground">
          {t({ ar: "المحتويات", en: "Contents" })}
        </div>
        {items}
      </nav>
      <div className="lg:hidden" data-toc-mobile>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-[13px] font-medium"
          data-toc-toggle
        >
          <span className="flex items-center gap-2">
            <List className="size-4 text-brand" />
            {t({ ar: "المحتويات", en: "Contents" })}
          </span>
          <span className="num text-muted-foreground">{iso(sections.length)}</span>
        </button>
        {open && <div className="mt-2 rounded-xl border border-border bg-card p-2">{items}</div>}
      </div>
    </>
  );
}

function BlockView({ b, lang }: { b: Block; lang: Lang }) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  switch (b.type) {
    case "p":
      return (
        <p className="text-[15px] leading-8 text-foreground/90 sm:text-[16px] sm:leading-9">
          {b.text}
        </p>
      );
    case "h":
      return <h3 className="pt-2 text-[16px] font-bold">{b.text}</h3>;
    case "quote":
      return (
        <blockquote className="border-s-4 border-brand/60 bg-brand/5 px-4 py-3 text-[15px] leading-8">
          {b.text}
        </blockquote>
      );
    case "list": {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag
          className={cn(
            "space-y-2 ps-6 text-[15px] leading-8",
            b.ordered ? "list-decimal" : "list-disc",
          )}
        >
          {b.items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </Tag>
      );
    }
    case "table_mismatch":
      return <TableMismatch b={b} />;
    case "table":
      return (
        <figure className="-mx-4 sm:mx-0" data-article-table>
          {/* التمرير الأفقي داخل الجدول فقط، لا في الصفحة. */}
          <div className="overflow-x-auto border-y border-border/70 sm:rounded-xl sm:border">
            <table className="w-full min-w-max text-[13px]" dir={dir}>
              <thead className="bg-muted/60 text-[12px]">
                <tr>
                  {b.header.map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        "whitespace-nowrap px-3 py-2.5 text-start font-semibold",
                        i === 0 && "sticky start-0 bg-muted",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, ri) => (
                  <tr key={ri} className="border-t border-border/60">
                    {r.map((c, ci) => (
                      <td
                        key={ci}
                        className={cn(
                          "whitespace-nowrap px-3 py-2",
                          ci === 0 && "sticky start-0 bg-card font-medium",
                          ci > 0 && isNumericCell(c) && "num text-end",
                        )}
                        dir={ci > 0 && isNumericCell(c) ? "ltr" : undefined}
                      >
                        {c || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
  }
}

/** أقسام المقال: كل قسم بلغته؛ قسم بغير لغة الواجهة يُعلَن، والنص يبقى كما ورد. */
export function ArticleSections({ sections }: { sections: Section[] }) {
  const lang = useLang();
  const { t } = useI18n();
  return (
    <div className="space-y-12">
      {sections.map((s, i) => {
        const h = pick(s.heading, lang);
        const body = pick(s.body, lang);
        const fallback = h.fallback || body.fallback;
        const blockLang = body.lang ?? lang;
        return (
          <section
            key={s.id}
            id={s.id}
            className="scroll-mt-24"
            data-article-section={s.id}
            lang={blockLang}
            dir={blockLang === "ar" ? "rtl" : "ltr"}
          >
            <h2 className="flex items-baseline gap-3 text-xl font-bold tracking-tight">
              <span className="num text-[13px] text-brand">
                {iso(String(i + 1).padStart(2, "0"))}
              </span>
              {h.value ?? t({ ar: `القسم ${i + 1}`, en: `Section ${i + 1}` })}
            </h2>
            {fallback && (
              <p
                className="mt-2 flex items-center gap-1.5 text-[12px] text-status-warn"
                dir={lang === "ar" ? "rtl" : "ltr"}
                data-lang-fallback
              >
                <Languages className="size-3.5" />
                {t(LIBRARY_COPY.fallback)}
              </p>
            )}
            <div className="mt-4 space-y-5">
              {parseBody(body.value).map((b, k) => (
                <BlockView key={k} b={b} lang={blockLang} />
              ))}
              {!body.value && (
                <p className="text-[13px] text-muted-foreground" data-section-empty>
                  {t({
                    ar: "لا نص لهذا القسم في المصدر.",
                    en: "No text for this section in the source.",
                  })}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function ReferencesList({ refs }: { refs: Reference[] }) {
  const { t } = useI18n();
  return (
    <section id="references" className="scroll-mt-24" data-references>
      <h2 className="text-lg font-bold">
        {t({ ar: "المراجع والمصادر", en: "References and sources" })}
      </h2>
      {refs.length ? (
        <ol className="mt-4 space-y-2.5 text-[13px] leading-6">
          {refs.map((r) => (
            <li key={r.index} className="flex gap-3" data-reference={r.index}>
              <span className="num w-6 shrink-0 text-muted-foreground">[{iso(r.index)}]</span>
              <span className="min-w-0 break-words" dir="auto">
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-brand hover:underline"
                  >
                    {r.text}
                    <ExternalLink className="ms-1 inline size-3" />
                  </a>
                ) : (
                  r.text
                )}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-[13px] text-muted-foreground" data-references-empty>
          {t({
            ar: "لم يُذكر أي مرجع في المصدر لهذا المحتوى.",
            en: "No references are listed in the source for this content.",
          })}
        </p>
      )}
    </section>
  );
}

/** سطر بيانات وصفية؛ كل عنصر غائب في المصدر لا يُعرض (لا مؤلف أو تاريخ افتراضي). */
export function Meta({ items }: { items: (ReactNode | null | false)[] }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
      {shown.map((x, i) => (
        <span key={i} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden>·</span>}
          {x}
        </span>
      ))}
    </div>
  );
}

export function ReadingTime({ minutes }: { minutes: number | null }) {
  const { t } = useI18n();
  if (!minutes) return null;
  return (
    <span className="flex items-center gap-1">
      <BookOpen className="size-3.5" />
      {t({ ar: `${iso(minutes)} دقائق قراءة`, en: `${minutes} min read` })}
    </span>
  );
}

/**
 * WEB-05C (إصلاح القبول): جدول لا تطابق صفوفه رأسه. لا يُعرض جدولًا ماليًا؛ تنبيه واضح ثم النص الأصلي كاملًا
 * بترتيبه داخل <pre> (نص فقط: React يهرّب أي HTML، ولا روابط)، قابل للقراءة والنسخ والتمرير داخله.
 */
function TableMismatch({ b }: { b: Extract<Block, { type: "table_mismatch" }> }) {
  const { t } = useI18n();
  const bad = b.widths.filter((w) => w !== b.header).length;
  return (
    <figure
      className="rounded-xl border border-status-warn/40 bg-status-warn/5"
      data-table-mismatch
      role="note"
    >
      <figcaption className="flex items-start gap-2 px-4 py-3 text-[13px] leading-6">
        <AlertTriangle className="mt-1 size-4 shrink-0 text-status-warn" />
        <span>
          {t({
            ar: `بنية هذا الجدول لا تطابق المصدر: الرأس فيه ${iso(b.header)} أعمدة، و${iso(bad)} من أسطره بعدد خلايا مختلف. لا يُعرض جدولًا ولا تُحذف أو تُضاف خلايا؛ النص الأصلي كاملًا أدناه.`,
            en: `This table's structure does not match its source: the header has ${b.header} columns and ${bad} of its lines have a different number of cells. It is not shown as a table and no cell is dropped or added; the full original text is below.`,
          })}
        </span>
      </figcaption>
      <pre
        className="overflow-x-auto whitespace-pre border-t border-status-warn/30 px-4 py-3 font-mono text-[12px] leading-6 [unicode-bidi:plaintext] ltr:text-left rtl:text-right"
        data-table-original
      >
        {b.text}
      </pre>
    </figure>
  );
}

/** تاريخ نشر البحث بحالته: صحيح يُعرض، غائب لا يُعرض، ومستحيل يُعلن دون عرض قيمته أو تصحيحها. */
export function PublishedDate({
  date,
  status,
}: {
  date: string | null;
  status: "valid" | "missing" | "invalid";
}) {
  const { t } = useI18n();
  if (status === "valid") return <DateText date={date} />;
  if (status === "missing") return null;
  return (
    <span className="text-status-warn" data-date-state="invalid">
      {t({ ar: "تاريخ النشر غير صالح في المصدر", en: "Publication date invalid in source" })}
    </span>
  );
}

export function DateText({ date }: { date: string | null }) {
  if (!date) return null;
  return (
    <time dateTime={date} className="num" dir="ltr">
      {date}
    </time>
  );
}

export function Chip({
  on,
  onClick,
  children,
  count,
  data,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  data: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      data-chip={data}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] transition-colors",
        on ? "border-brand bg-brand text-brand-foreground" : "border-border hover:bg-muted",
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("num", on ? "opacity-80" : "text-muted-foreground")}>{iso(count)}</span>
      )}
    </button>
  );
}

export function BackLink({ to, label }: { to: string; label: LocalizedText }) {
  const { t } = useI18n();
  return (
    <Link to={to as never} className="text-[13px] text-brand hover:underline" data-back-link>
      {t(label)}
    </Link>
  );
}
