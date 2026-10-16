import { createFileRoute } from "@tanstack/react-router";
import { loadCompany } from "@/lib/web-v1/company-loader";
import { hasExperience, intelSearch } from "@/lib/web-v1/company-experience";
import { WebV1Shell } from "@/components/web-v1/shell";
import { CompanyHero, topicGroup } from "@/components/web-v1/company-template";
import { CompanyLevels } from "@/components/web-v1/company-levels";
import { CompanyIntelligence } from "@/components/web-v1/company-intelligence";
import { EngineError, NotBuiltYet } from "@/components/web-v1/company-states";

/** WEB-07 المستوى 2: تحليل الشركة (الموضوعات الثمانية عشر). ?topic=&focus= رابط عميق، و?q= بحث. */
export const Route = createFileRoute("/preview/web-v1/companies/$symbol_/intelligence")({
  validateSearch: intelSearch,
  loader: ({ params }) => loadCompany(params.symbol, true),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.result.state === "ok" ? loaderData.result.preview.company.name.ar : "معاينة"} · تحليل الشركة | معرفة استثمار`,
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: IntelligencePage,
});

function IntelligencePage() {
  const { result, peers } = Route.useLoaderData();
  const { symbol } = Route.useParams();
  const { topic, focus, q } = Route.useSearch();
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
          <CompanyLevels symbol={symbol} level="intelligence" />
          <CompanyIntelligence p={p} peers={peers} topic={topic} focus={focus} q={q} />
        </>
      ) : (
        <NotBuiltYet symbol={symbol} />
      )}
    </WebV1Shell>
  );
}
