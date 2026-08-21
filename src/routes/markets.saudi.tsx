import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { CompanyCard } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getCompanies } from "@/lib/content";
import { cn } from "@/lib/utils";
import type { Company } from "@/data/types";

export const Route = createFileRoute("/markets/saudi")({
  loader: async () => {
    const companies = await getCompanies();
    const saudi = companies.filter((c) => c.exchange === "تداول" || c.exchange === "نمو");
    return { saudi };
  },
  head: () => ({
    meta: [
      { title: "السوق السعودي | معرفة استثمار" },
      { name: "description", content: "شركات السوق السعودي (تداول) — تاسي والسوق الموازي (نمو)." },
    ],
  }),
  component: SaudiMarketPage,
});

type SortKey = "default" | "marketCap" | "change" | "alpha";
type SegmentKey = "all" | "تداول" | "نمو";

function parseMarketCap(v: string): number {
  const num = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  if (v.includes("T")) return num * 1000;
  return num;
}

function SaudiMarketPage() {
  const { t } = useI18n();
  const { saudi } = Route.useLoaderData();
  const [segment, setSegment] = useState<SegmentKey>("all");
  const [sectorSlug, setSectorSlug] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("default");

  const sectorOptions = useMemo(() => {
    const seen = new Map<string, { slug: string; name: Company["sectorName"] }>();
    for (const c of saudi) {
      if (c.sectorSlug && !seen.has(c.sectorSlug)) {
        seen.set(c.sectorSlug, { slug: c.sectorSlug, name: c.sectorName });
      }
    }
    return [...seen.values()].sort((a, b) => t(a.name).localeCompare(t(b.name)));
  }, [saudi, t]);

  const companies = useMemo(() => {
    let list = saudi;
    if (segment !== "all") list = list.filter((c) => c.exchange === segment);
    if (sectorSlug !== "all") list = list.filter((c) => c.sectorSlug === sectorSlug);
    const sorted = [...list];
    if (sort === "marketCap")
      sorted.sort((a, b) => parseMarketCap(b.marketCap) - parseMarketCap(a.marketCap));
    if (sort === "change")
      sorted.sort(
        (a, b) =>
          parseFloat(b.change.replace(/[^0-9.-]/g, "")) -
          parseFloat(a.change.replace(/[^0-9.-]/g, "")),
      );
    if (sort === "alpha") sorted.sort((a, b) => t(a.name).localeCompare(t(b.name)));
    return sorted;
  }, [saudi, segment, sectorSlug, sort, t]);

  const tasiCount = saudi.filter((c) => c.exchange === "تداول").length;
  const nomuCount = saudi.filter((c) => c.exchange === "نمو").length;

  return (
    <PageShell>
      <Container>
        <nav className="flex items-center gap-1.5 pt-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t(ui.home)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <Link to="/markets" className="hover:text-foreground">
            {t(ui.markets)}
          </Link>
          <ChevronLeft className="size-3.5 rtl:rotate-180" />
          <span className="text-foreground">{t({ ar: "السوق السعودي", en: "Saudi Market" })}</span>
        </nav>
      </Container>

      <PageHero
        eyebrow={t(ui.markets)}
        title={t({ ar: "السوق السعودي", en: "Saudi Market" })}
        description={t({
          ar: "السوق المالية السعودية (تداول)، بسوقيها الرئيسي (تاسي) والموازي (نمو).",
          en: "The Saudi Exchange (Tadawul), spanning its Main Market (TASI) and Parallel Market (Nomu).",
        })}
      />

      <Container>
        {/* فلتر السوق الفرعي: تاسي / نمو */}
        <div className="mb-3 flex flex-wrap gap-2">
          {(
            [
              { key: "all", label: { ar: "الكل", en: "All" }, count: saudi.length },
              { key: "تداول", label: { ar: "تاسي — الرئيسي", en: "TASI — Main" }, count: tasiCount },
              { key: "نمو", label: { ar: "نمو — الموازي", en: "Nomu — Parallel" }, count: nomuCount },
            ] as const
          ).map((seg) => (
            <button
              key={seg.key}
              onClick={() => setSegment(seg.key)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                segment === seg.key
                  ? "border-transparent bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t(seg.label)} <span className="opacity-60">· {seg.count}</span>
            </button>
          ))}
        </div>

        {/* فلتر القطاع */}
        <div className="mb-5 flex flex-wrap gap-2">
          {[{ slug: "all", name: { ar: "كل القطاعات", en: "All sectors" } }, ...sectorOptions].map(
            (s) => (
              <button
                key={s.slug}
                onClick={() => setSectorSlug(s.slug)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  sectorSlug === s.slug
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border/70 text-muted-foreground hover:text-foreground",
                )}
              >
                {t(s.name)}
              </button>
            ),
          )}
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {companies.length} {t({ ar: "نتيجة", en: "results" })}
          </span>
          <div className="flex gap-1.5">
            {(
              [
                { key: "default", label: { ar: "الافتراضي", en: "Default" } },
                { key: "marketCap", label: { ar: "القيمة السوقية", en: "Market cap" } },
                { key: "change", label: { ar: "الأداء", en: "Performance" } },
                { key: "alpha", label: { ar: "أبجدياً", en: "Alphabetical" } },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  sort === opt.key
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border/70 bg-card hover:bg-muted",
                )}
              >
                {t(opt.label)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {companies.map((c) => (
            <CompanyCard key={c.slug} company={c} />
          ))}
        </div>
        {!companies.length && (
          <p className="text-sm text-muted-foreground">
            {t({ ar: "لا توجد نتائج.", en: "No results." })}
          </p>
        )}
      </Container>
    </PageShell>
  );
}
