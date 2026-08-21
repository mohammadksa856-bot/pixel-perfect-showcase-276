import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { CompanyCard } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getCompanies } from "@/lib/content";
import { cn } from "@/lib/utils";
import type { Company } from "@/data/types";

export const Route = createFileRoute("/markets/us")({
  loader: async () => {
    const companies = await getCompanies();
    const us = companies.filter((c) => c.exchange !== "تداول" && c.exchange !== "نمو");
    return { us };
  },
  head: () => ({
    meta: [
      { title: "السوق الأمريكي | معرفة استثمار" },
      { name: "description", content: "شركات السوق الأمريكي — ناسداك ونيويورك." },
    ],
  }),
  component: UsMarketPage,
});

type SortKey = "default" | "marketCap" | "change" | "alpha";

function parseMarketCap(v: string): number {
  const num = parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  if (v.includes("T")) return num * 1000;
  return num;
}

function UsMarketPage() {
  const { t } = useI18n();
  const { us } = Route.useLoaderData();
  const [exchange, setExchange] = useState<string>("all");
  const [sectorSlug, setSectorSlug] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("default");

  const exchangeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of us) counts.set(c.exchange || "—", (counts.get(c.exchange || "—") ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [us]);

  const sectorOptions = useMemo(() => {
    const seen = new Map<string, { slug: string; name: Company["sectorName"] }>();
    for (const c of us) {
      if (c.sectorSlug && !seen.has(c.sectorSlug)) {
        seen.set(c.sectorSlug, { slug: c.sectorSlug, name: c.sectorName });
      }
    }
    return [...seen.values()].sort((a, b) => t(a.name).localeCompare(t(b.name)));
  }, [us, t]);

  const companies = useMemo(() => {
    let list = us;
    if (exchange !== "all") list = list.filter((c) => c.exchange === exchange);
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
  }, [us, exchange, sectorSlug, sort, t]);

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
          <span className="text-foreground">{t({ ar: "السوق الأمريكي", en: "US Market" })}</span>
        </nav>
      </Container>

      <PageHero
        eyebrow={t(ui.markets)}
        title={t({ ar: "السوق الأمريكي", en: "US Market" })}
        description={t({
          ar: "الشركات المُدرجة بالبورصات الأمريكية — ناسداك ونيويورك.",
          en: "Companies listed on US exchanges — NASDAQ and NYSE.",
        })}
      />

      <Container>
        {exchangeOptions.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {[["all", us.length] as const, ...exchangeOptions].map(([key, count]) => (
              <button
                key={key}
                onClick={() => setExchange(key)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                  exchange === key
                    ? "border-transparent bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {key === "all" ? t({ ar: "الكل", en: "All" }) : key}{" "}
                <span className="opacity-60">· {count}</span>
              </button>
            ))}
          </div>
        )}

        {sectorOptions.length > 1 && (
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
        )}

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
