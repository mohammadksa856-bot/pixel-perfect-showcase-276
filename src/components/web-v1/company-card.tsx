import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import { BOARD_TEXT, DATA_TEXT, type DirectoryEntry } from "@/lib/web-v1/catalog";
import { TaxonomyLabel } from "./display-label";
import { Pill, READINESS_META } from "./primitives";

/**
 * WEB-05A: بطاقة الشركة الموحدة (الرئيسية، الدليل، النتائج). نفس مفردات قالب الشركة:
 * الرمز، والسوق، والقطاع من مصدر موثق فقط، وحالة البيانات، وحالتا الجاهزية دون أي درجة أو سعر.
 */
export function CompanyCard({ e }: { e: DirectoryEntry }) {
  const { t, locale } = useI18n();
  const hasPage = e.dataStatus === "engine_page";
  const name = locale === "en" && e.name.en ? e.name.en : e.name.ar;
  const alt = locale === "en" ? e.name.ar : e.name.en;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* WEB-05B: الاسم يلتف ولا يُقصّ (لا نص مخفي، ولا تجاوز لعرض الجوال). */}
          <div className="break-words text-[15px] font-bold [unicode-bidi:plaintext] ltr:text-left rtl:text-right">
            {name}
          </div>
          {alt && alt !== name && (
            <div className="break-words text-[11px] text-muted-foreground [unicode-bidi:plaintext] ltr:text-left rtl:text-right">
              {alt}
            </div>
          )}
        </div>
        <code
          dir="ltr"
          className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[12px] font-semibold"
        >
          {e.symbol}
        </code>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={cn(
            "rounded-md border px-1.5 py-0.5",
            e.board === "nomu"
              ? "border-tone-violet/40 text-tone-violet"
              : "border-border text-muted-foreground",
          )}
        >
          {t(BOARD_TEXT[e.board])}
        </span>
        <span className="rounded-md border border-border px-1.5 py-0.5 text-muted-foreground">
          {e.sector ? (
            <TaxonomyLabel raw={e.sector} />
          ) : (
            t({ ar: "القطاع غير مصنّف في المصدر", en: "Sector not classified in source" })
          )}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        {hasPage && e.readiness ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{t({ ar: "موضوعات", en: "Topics" })}</span>
            <Pill meta={READINESS_META[e.readiness.investorTopics]} />
            <span>{t({ ar: "المصنع", en: "Factory" })}</span>
            <Pill meta={READINESS_META[e.readiness.operationalCategories]} />
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">{t(DATA_TEXT[e.dataStatus])}</span>
        )}
        {hasPage && <ArrowUpRight className="size-4 shrink-0 text-brand" />}
      </div>
      {hasPage && e.latestFiling && (
        <div className="num mt-2 text-[10px] text-muted-foreground">
          {t({ ar: "آخر إفصاح ", en: "Latest filing " })}
          {iso(e.latestFiling)}
        </div>
      )}
    </>
  );
  const cls =
    "block h-full min-w-0 rounded-2xl border border-border/70 bg-card p-4 transition-colors";
  return hasPage ? (
    <Link
      to="/preview/web-v1/companies/$symbol"
      params={{ symbol: e.symbol }}
      search={{ tab: "business" }}
      className={cn(cls, "hover:border-brand/50")}
      data-company-card={e.symbol}
      data-data-status={e.dataStatus}
    >
      {body}
    </Link>
  ) : (
    <div className={cls} data-company-card={e.symbol} data-data-status={e.dataStatus}>
      {body}
    </div>
  );
}
