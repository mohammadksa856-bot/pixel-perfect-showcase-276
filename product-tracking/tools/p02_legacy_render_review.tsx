// Isolated legacy component measurement, NOT unified page acceptance.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { renderToStaticMarkup } from "react-dom/server";
import { buildCompanyPreview } from "../../src/lib/engine/company-preview";
import { I18nProvider } from "../../src/lib/i18n";
import { TopicOverview, TopicSection } from "../../src/components/engine-preview";
const page = JSON.parse(gunzipSync(readFileSync(new URL("../../tests/fixtures/p02/engine-b70254e_page_SA-2222.json.gz", import.meta.url))).toString());
const p = buildCompanyPreview(page);
const html=renderToStaticMarkup(<I18nProvider><TopicOverview topics={p.topics}/>{p.topics.map(topic=><TopicSection key={topic.key} topic={topic} preview={p} peers={null}/>)}</I18nProvider>);
console.log(JSON.stringify({scope:"Legacy v4 isolated SSR components only; not live acceptance",raw_page_version:page.contract_version,topic_count:p.topics.length,view_model_bytes:Buffer.byteLength(JSON.stringify(p)),topic_HTML_bytes:Buffer.byteLength(html),calculated_shown:p.topics.flatMap(t=>t.blocks).flatMap(b=>b.type==='metrics'?b.group.cells:[]).filter(c=>c.proof.kind==='calculated_inputs_reproduced').length,readiness:p.readiness,topic_scores:p.topics.map(t=>({key:t.key,score:t.score})),risk:"Hydration embeds full model in addition to SSR text; do not remove provenance or withholding reasons"}));
