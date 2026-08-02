import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { getIcon } from "@/lib/icons";
import { ui, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Company, KnowledgeArticle, Research, Sector } from "@/data/types";

export function Arrow({ className }: { className?: string }) {
  const { locale } = useI18n();
  const Icon = locale === "ar" ? ArrowLeft : ArrowRight;
  return <Icon className={cn("size-4", className)} />;
}

export function SectionHeading({
  title,
  subtitle,
  to,
}: {
  title: string;
  subtitle?: string;
  to?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-7 flex items-end justify-between gap-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          {t(ui.viewAll)}
          <Arrow className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

const cardBase =
  "group rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-lift";

export function SectorCard({ sector }: { sector: Sector }) {
  const { t } = useI18n();
  const Icon = getIcon(sector.icon);
  return (
    <Link
      to="/sectors/$slug"
      params={{ slug: sector.slug }}
      className={cn(cardBase, "flex items-center gap-4 p-5")}
    >
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `color-mix(in oklch, var(--${sector.tone}) 14%, transparent)` }}
      >
        <Icon className="size-6" style={{ color: `var(--${sector.tone})` }} strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{t(sector.name)}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {t(sector.tagline)}
        </span>
      </span>
      <Arrow className="ms-auto size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export function CompanyCard({ company }: { company: Company }) {
  const { t } = useI18n();
  return (
    <Link
      to="/companies/$slug"
      params={{ slug: company.slug }}
      className={cn(cardBase, "flex flex-col gap-3 p-5")}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-[11px] font-bold tracking-tight">
          {company.ticker}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{t(company.name)}</div>
          <div className="text-[11px] text-muted-foreground">{company.exchange}</div>
        </div>
        <span
          className={cn(
            "ms-auto text-xs font-semibold",
            company.change.startsWith("-") ? "text-tone-rose" : "text-tone-emerald",
          )}
        >
          {company.change}
        </span>
      </div>
      <p className="line-clamp-2 text-xs leading-6 text-muted-foreground">{t(company.short)}</p>
      <div className="mt-auto flex items-center justify-between pt-1 text-[11px]">
        <span className="rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
          {company.price}
        </span>
        <span className="text-muted-foreground">{company.marketCap}</span>
      </div>
    </Link>
  );
}

export function ResearchCard({ item }: { item: Research }) {
  const { t } = useI18n();
  return (
    <Link
      to="/research/$slug"
      params={{ slug: item.slug }}
      className={cn(cardBase, "flex flex-col overflow-hidden")}
    >
      <img
        src={item.image}
        alt={t(item.title)}
        loading="lazy"
        width={900}
        height={600}
        className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag.en}
              className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {t(tag)}
            </span>
          ))}
        </div>
        <h3 className="mt-3 text-sm font-bold leading-6">{t(item.title)}</h3>
        <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">
          {t(item.summary)}
        </p>
        <div className="mt-4 flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
          <span>{t(item.author)}</span>
          <span>·</span>
          <span>{item.date}</span>
          <span className="ms-auto inline-flex items-center gap-1">
            <Clock className="size-3" />
            {item.readingTime} {t(ui.readingTime)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function KnowledgeCard({ item }: { item: KnowledgeArticle }) {
  const { t } = useI18n();
  const Icon = getIcon(item.icon);
  return (
    <Link
      to="/knowledge/$slug"
      params={{ slug: item.slug }}
      className={cn(cardBase, "flex flex-col gap-3 p-5")}
    >
      <Icon className="size-6 text-brand" strokeWidth={1.7} />
      <div>
        <h3 className="text-sm font-bold">{t(item.title)}</h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-muted-foreground">
          {t(item.summary)}
        </p>
      </div>
      <div className="mt-auto flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
        <span className="rounded-md bg-secondary px-2 py-0.5">{t(item.level)}</span>
        <span>
          {item.readingTime} {t(ui.readingTime)}
        </span>
      </div>
    </Link>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card p-6", className)}>
      {title && <h2 className="mb-4 text-base font-bold">{title}</h2>}
      {children}
    </section>
  );
}
