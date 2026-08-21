import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PageHero, PageShell, Container } from "@/components/page-shell";
import { CompanyCard, SectionHeading } from "@/components/cards";
import { ui, useI18n } from "@/lib/i18n";
import { getCompanies } from "@/lib/content";

export const Route = createFileRoute("/markets/saudi")({
  loader: async () => {
    const companies = await getCompanies();
    const tasi = companies.filter((c) => c.exchange === "تداول");
    const nomu = companies.filter((c) => c.exchange === "نمو");
    return { tasi, nomu };
  },
  head: () => ({
    meta: [
      { title: "السوق السعودي | معرفة استثمار" },
      { name: "description", content: "شركات السوق السعودي (تداول) — تاسي والسوق الموازي (نمو)." },
    ],
  }),
  component: SaudiMarketPage,
});

function SaudiMarketPage() {
  const { t } = useI18n();
  const { tasi, nomu } = Route.useLoaderData();

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
        <section className="mb-16">
          <SectionHeading title={t({ ar: "تاسي — السوق الرئيسي", en: "TASI — Main Market" })} />
          {tasi.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tasi.map((c) => (
                <CompanyCard key={c.slug} company={c} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t({ ar: "لا توجد شركات مضافة بعد.", en: "No companies added yet." })}
            </p>
          )}
        </section>

        <section>
          <SectionHeading title={t({ ar: "نمو — السوق الموازي", en: "Nomu — Parallel Market" })} />
          {nomu.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {nomu.map((c) => (
                <CompanyCard key={c.slug} company={c} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t({ ar: "لا توجد شركات مضافة بعد.", en: "No companies added yet." })}
            </p>
          )}
        </section>
      </Container>
    </PageShell>
  );
}
