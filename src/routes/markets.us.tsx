import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { CompanyCard, SectionHeading } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getCompanies } from "@/lib/content";
import type { Company } from "@/data/types";

export const Route = createFileRoute("/markets/us")({
  loader: async () => {
    const companies = await getCompanies();
    const us = companies.filter((c) => c.exchange !== "تداول");
    // نجمّع حسب قيمة exchange الفعلية (NASDAQ/NYSE...) بدل تثبيتها يدوياً —
    // أي بورصة جديدة تُضاف مستقبلاً تظهر قسماً خاصاً بها تلقائياً.
    const byExchange = new Map<string, Company[]>();
    for (const c of us) {
      const key = c.exchange || "—";
      byExchange.set(key, [...(byExchange.get(key) ?? []), c]);
    }
    return { groups: [...byExchange.entries()].sort((a, b) => b[1].length - a[1].length) };
  },
  head: () => ({
    meta: [
      { title: "السوق الأمريكي | معرفة استثمار" },
      { name: "description", content: "شركات السوق الأمريكي — ناسداك ونيويورك." },
    ],
  }),
  component: UsMarketPage,
});

function UsMarketPage() {
  const { t } = useI18n();
  const { groups } = Route.useLoaderData();

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
        {groups.length ? (
          groups.map(([exchange, companies]) => (
            <section key={exchange} className="mb-16">
              <SectionHeading title={exchange} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {companies.map((c) => (
                  <CompanyCard key={c.slug} company={c} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            {t({ ar: "لا توجد شركات مضافة بعد.", en: "No companies added yet." })}
          </p>
        )}
      </Container>
    </PageShell>
  );
}
