import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { loadCompany } from "@/lib/web-v1/company-loader";
import { hasExperience } from "@/lib/web-v1/company-experience";
import { WebV1Shell } from "@/components/web-v1/shell";
import { CompanyHero, topicGroup } from "@/components/web-v1/company-template";
import { CompanyLevels } from "@/components/web-v1/company-levels";
import { CompanyOverview } from "@/components/web-v1/company-overview";
import { EngineError, NotBuiltYet } from "@/components/web-v1/company-states";

/** WEB-07 المستوى 1: نظرة عامة. نفس شروط الإتاحة والبيانات في صفحة الشركة (WEB-06). */
export const Route = createFileRoute("/preview/web-v1/companies/$symbol_/overview")({
  loader: ({ params }) => loadCompany(params.symbol, false),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.result.state === "ok" ? loaderData.result.preview.company.name.ar : "معاينة"} · نظرة عامة | معرفة استثمار`,
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { result } = Route.useLoaderData();
  const { symbol } = Route.useParams();
  useI18n();
  if (result.state !== "ok")
    return <EngineError reason={"reason" in result ? result.reason : ""} />;
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
      {hasExperience(symbol) ? (
        <>
          <CompanyLevels symbol={symbol} level="overview" />
          <CompanyOverview p={p} />
        </>
      ) : (
        <NotBuiltYet symbol={symbol} />
      )}
    </WebV1Shell>
  );
}
