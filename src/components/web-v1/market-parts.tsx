import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, CircleSlash } from "lucide-react";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { iso } from "@/lib/bidi";
import { cn } from "@/lib/utils";
import { PreviewContainer } from "./shell";

/** WEB-05B: أجزاء مشتركة لصفحات الأسواق والقطاعات، بنفس مفردات الواجهة الرئيسية ودليل الشركات. */

export type Crumb = { label: LocalizedText; to?: string; params?: Record<string, string> };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t({ ar: "مسار التصفح", en: "Breadcrumb" })}
      className="flex flex-wrap items-center gap-1.5 text-[12px] text-night-foreground/60"
      data-breadcrumbs
    >
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronLeft className="size-3.5 ltr:rotate-180" />}
          {c.to ? (
            <Link
              to={c.to as never}
              params={c.params as never}
              className="hover:text-night-foreground"
              data-crumb={i}
            >
              {t(c.label)}
            </Link>
          ) : (
            <span className="text-night-foreground" aria-current="page">
              {t(c.label)}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  crumbs,
  title,
  titleDir,
  description,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  titleDir?: "auto" | undefined;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="night-panel border-b border-border/40">
      <PreviewContainer className="py-8 sm:py-10">
        <Breadcrumbs items={crumbs} />
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl" dir={titleDir}>
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-night-foreground/65">
            {description}
          </p>
        )}
        {children}
      </PreviewContainer>
    </section>
  );
}

/** رقم محسوب من القائمة (عدد شركات)، لا سعر ولا قيمة سوقية. */
export function CountTile({
  label,
  value,
  hint,
  data,
}: {
  label: LocalizedText;
  value: number;
  hint?: LocalizedText;
  data?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className="rounded-2xl border border-night-foreground/10 bg-night-foreground/[0.04] p-4"
      data-count-tile={data}
      data-value={value}
    >
      <div className="text-[11px] text-night-foreground/60">{t(label)}</div>
      <div className="num mt-1 text-2xl font-bold">{iso(value)}</div>
      {hint && <div className="mt-1 text-[11px] text-night-foreground/55">{t(hint)}</div>}
    </div>
  );
}

/** حالة نقص بيانات صريحة: ما الغائب ولماذا، بلا قيمة بديلة. */
export function MissingState({
  title,
  reason,
  className,
  data,
}: {
  title: LocalizedText;
  reason: LocalizedText;
  className?: string;
  data?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-4",
        className,
      )}
      data-missing={data}
    >
      <CircleSlash className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <div className="text-[13px] font-semibold">{t(title)}</div>
        <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{t(reason)}</p>
      </div>
    </div>
  );
}

export function SourceNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-8 text-[11px] leading-5 text-muted-foreground" data-source-note>
      {children}
    </p>
  );
}
