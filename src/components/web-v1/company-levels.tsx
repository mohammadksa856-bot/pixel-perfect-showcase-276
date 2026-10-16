import { Link } from "@tanstack/react-router";
import { BookOpenText, Database, LayoutDashboard } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LEVELS, type CompanyLevel } from "@/lib/web-v1/company-experience";
import { PreviewContainer } from "./shell";

const ICON = { overview: LayoutDashboard, intelligence: BookOpenText, data: Database } as const;

/**
 * WEB-07: التنقل بين مستويات صفحة الشركة الثلاثة. روابط حقيقية (تعمل بلوحة المفاتيح ودون JavaScript)،
 * والمستوى الحالي بـ aria-current وإطار، لا باللون وحده.
 */
export function CompanyLevels({ symbol, level }: { symbol: string; level: CompanyLevel }) {
  const { t } = useI18n();
  return (
    <div className="border-b border-border/60 bg-card/40" data-company-levels={level}>
      <PreviewContainer>
        <nav
          aria-label={t({ ar: "مستويات صفحة الشركة", en: "Company page levels" })}
          className="grid grid-cols-3 gap-1.5 py-2.5 sm:flex sm:flex-wrap"
        >
          {LEVELS.map((l, i) => {
            const active = l.id === level;
            const Icon = ICON[l.id];
            const cls = cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-center transition-colors sm:flex-row sm:gap-2.5 sm:px-3.5 sm:text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active
                ? "bg-brand/15 text-foreground ring-1 ring-inset ring-brand/70"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            );
            const body = (
              <>
                <Icon className="size-4 shrink-0 text-brand" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold leading-5 sm:text-[13px]">
                    <span className="num me-1 hidden text-[11px] text-muted-foreground sm:inline">
                      {i + 1}
                    </span>
                    {t(l.title)}
                  </span>
                  <span className="hidden text-[11px] leading-4 text-muted-foreground sm:block">
                    {t(l.hint)}
                  </span>
                </span>
              </>
            );
            const common = {
              className: cls,
              "data-level-link": l.id,
              "aria-current": active ? ("page" as const) : undefined,
            };
            if (l.id === "data")
              return (
                <Link
                  key={l.id}
                  to="/preview/web-v1/companies/$symbol"
                  params={{ symbol }}
                  search={{ tab: "business" }}
                  {...common}
                >
                  {body}
                </Link>
              );
            if (l.id === "intelligence")
              return (
                <Link
                  key={l.id}
                  to="/preview/web-v1/companies/$symbol/intelligence"
                  params={{ symbol }}
                  search={{}}
                  {...common}
                >
                  {body}
                </Link>
              );
            return (
              <Link
                key={l.id}
                to="/preview/web-v1/companies/$symbol/overview"
                params={{ symbol }}
                {...common}
              >
                {body}
              </Link>
            );
          })}
        </nav>
      </PreviewContainer>
    </div>
  );
}
