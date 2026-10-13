import { createFileRoute, notFound } from "@tanstack/react-router";
import { getCompanyPreview } from "@/lib/engine/company-preview.functions";
import { getPeerTable } from "@/lib/engine/peer-comparison.functions";
import { getWebV1Enabled } from "@/lib/web-v1/flag.functions";
import { COMPANY_TABS, type CompanyTab } from "@/lib/web-v1/model";
import { useI18n } from "@/lib/i18n";
import { PreviewContainer, WebV1Shell } from "@/components/web-v1/shell";
import {
  CompanyHero,
  CompanyTabs,
  CoverageView,
  GroupView,
  topicGroup,
} from "@/components/web-v1/company-template";

/**
 * WEB-V1: قالب صفحة الشركة (خمس مجموعات + تغطية البيانات). معطّل افتراضيًا:
 * يتطلب WEB_V1_PREVIEW_ENABLED="true" وENGINE_PREVIEW_ENABLED="true" على الخادم، وإلا 404.
 */
export const Route = createFileRoute("/preview/web-v1/companies/$symbol")({
  validateSearch: (s: Record<string, unknown>): { tab: CompanyTab; open?: string } => ({
    tab: COMPANY_TABS.includes(s["tab"] as CompanyTab) ? (s["tab"] as CompanyTab) : "business",
    ...(typeof s["open"] === "string" && /^[a-z_]{1,40}$/.test(s["open"])
      ? { open: s["open"] }
      : {}),
  }),
  loader: async ({ params }) => {
    if (!(await getWebV1Enabled())) throw notFound();
    const ref = { market: "SA", symbol: params.symbol };
    const [result, peers] = await Promise.all([
      getCompanyPreview({ data: ref }),
      getPeerTable({ data: ref }).catch(() => null),
    ]);
    if (result.state === "disabled" || result.state === "not_found") throw notFound();
    return { result, peers };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.result.state === "ok" ? loaderData.result.preview.company.name.ar : "معاينة"} | معرفة استثمار`,
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CompanyPage,
});

function CompanyPage() {
  const { result, peers } = Route.useLoaderData();
  const { tab, open } = Route.useSearch();
  const { t } = useI18n();
  if (result.state !== "ok")
    return (
      <WebV1Shell>
        <PreviewContainer className="py-16">
          <div
            className="rounded-2xl border border-status-bad/40 bg-status-bad/5 p-6"
            data-engine-error
          >
            <h1 className="text-lg font-bold">
              {t({ ar: "تعذر تحميل بيانات المحرك", en: "Engine data could not be loaded" })}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t({ ar: "لا تُعرض أي أرقام بديلة.", en: "No substitute figures are shown." })}{" "}
              <code dir="ltr">{"reason" in result ? result.reason : ""}</code>
            </p>
          </div>
        </PreviewContainer>
      </WebV1Shell>
    );
  const p = result.preview;
  return (
    <WebV1Shell
      searchContext={{
        symbol: p.company.symbol,
        name: p.company.name,
        topics: p.topics.map((x) => ({
          ordinal: x.ordinal,
          title: x.title,
          group: topicGroup(x.ordinal),
        })),
      }}
    >
      <CompanyHero p={p} />
      <CompanyTabs p={p} tab={tab} />
      {tab === "coverage" ? (
        <CoverageView p={p} open={open} />
      ) : (
        <GroupView p={p} tab={tab} peers={peers} />
      )}
    </WebV1Shell>
  );
}
