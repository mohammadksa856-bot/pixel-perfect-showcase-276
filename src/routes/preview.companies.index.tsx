import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageShell, PageHero, Container } from "@/components/page-shell";
import { getPreviewEnabled, PREVIEW_COMPANIES } from "@/lib/engine/company-preview.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/preview/companies/")({
  loader: async () => {
    if (!(await getPreviewEnabled())) throw notFound();
    return null;
  },
  head: () => ({
    meta: [
      { title: "معاينة صفحات الشركات | معرفة استثمار" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreviewIndex,
});

function PreviewIndex() {
  const { t } = useI18n();
  return (
    <PageShell>
      <PageHero
        eyebrow={t({ ar: "معاينة داخلية", en: "Internal preview" })}
        title={t({
          ar: "صفحات الشركات من محرك البيانات",
          en: "Company pages from the data engine",
        })}
        description={t({
          ar: "ثلاث شركات من قطاعات مختلفة لاختبار الصفحة على بيانات المحرك الفعلية: ما يتوفر يُعرض بمصدره، وما لا يتوفر يُذكر سببه.",
          en: "Three companies from different sectors to test the page on real engine data: what is available is shown with its source; what is missing is shown with its reason.",
        })}
      />
      <Container>
        <div className="grid gap-4 sm:grid-cols-3">
          {PREVIEW_COMPANIES.map((c) => (
            <Link
              key={c.symbol}
              to="/preview/companies/$symbol"
              params={{ symbol: c.symbol }}
              className="rounded-2xl border border-border/70 bg-card p-6 transition-colors hover:border-brand/50"
            >
              <div className="text-[11px] text-muted-foreground">{t(c.kind)}</div>
              <div className="mt-1 text-lg font-bold">{t(c.name)}</div>
              <div className="mt-1 text-sm text-muted-foreground" dir="ltr">
                SA:{c.symbol}
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </PageShell>
  );
}
