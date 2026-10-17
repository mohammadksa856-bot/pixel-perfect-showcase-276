/**
 * WEB-08B04 — المخاطر والتوقعات، مفصولة حسب النوع: الإفصاح الرسمي (سجل)، وتوجيهات الإدارة،
 * والتفسير البحثي، والافتراضات، والسيناريوهات النوعية. لا رقم في افتراض أو سيناريو، ولا يُعرض أي منهما كنتيجة.
 */
import { P, claim, metric } from "./content-business";
import type { Section } from "./schema";

export const RISKS: Section = {
  id: "risks-outlook",
  title: { ar: "المخاطر والتوقعات", en: "Risks and outlook" },
  paragraphs: [
    // ── الإفصاح الرسمي (كما في سجل المحرك)
    P(
      "rk-disc-factors",
      "reported_record",
      ["risks", "industry"],
      "تعرض الشركة نتائجها لأسعار النفط والغاز، والطلب العالمي، والتنظيم، وقرارات الحكومة بشأن الإنتاج، إضافة إلى مخاطر تشغيلية ومخاطر مشاريع ومخاطر جيوسياسية. المراجع المستقل لم يجد فقرة أصلية مطابقة لهذا الملخص المركب.",
      [claim("aramco-hydrocarbon-risk-factors")],
    ),
    P(
      "rk-disc-contingencies",
      "reported_record",
      ["risks"],
      "تفصح الشركة عن أصول والتزامات محتملة ناشئة في سياق الأعمال المعتاد عن مطالبات المقاولين والدعاوى والتحكيم. ويصف الإيضاح نفسه ترتيبات الدعم والضمان المتعلقة بصدارة وبترورابغ، دون مبلغ مجمّع.",
      [claim("aramco-contingencies-ordinary-course"), claim("aramco-sadara-petro-rabigh-support")],
    ),
    P(
      "rk-disc-credit",
      "reported_record",
      ["risks"],
      "تذكر الشركة أن ذممها التجارية المدينة ناشئة عن قاعدة عملاء عالمية، ما يحد من تركّز مخاطر الائتمان جغرافيًا. لا رقم لتركّز عميل رئيسي.",
      [claim("aramco-customer-credit-concentration")],
    ),
    P(
      "rk-disc-commitments",
      "reported_record",
      ["risks", "operations"],
      "التزامات قائمة: شراء حفارات مضمونة متبقية في نهاية 2025، وحد أدنى للحجم في عقد معالجة جافورة.",
      [claim("aramco-rig-purchase-commitments"), claim("aramco-jafurah-midstream-contract")],
    ),
    P(
      "rk-disc-esg",
      "reported_record",
      ["esg", "risks"],
      "يحمل سجل المحرك مؤشرات أداء الاستدامة لعام 2025: كثافة الكربون في التنقيب والإنتاج، وكثافة الميثان، وكثافة الحرق، وانبعاثات النطاق الأول.",
      [
        metric("upstream_carbon_intensity"),
        metric("methane_intensity"),
        metric("flaring_intensity"),
        metric("scope_1_emissions"),
      ],
    ),

    // ── توجيهات الإدارة
    P(
      "rk-mgmt-guidance",
      "management_plan",
      ["forecasts"],
      "توجيهات الإدارة في الأدلة ثلاثة:\n1. نطاق الاستثمار الرأسمالي لعام 2026.\n2. نمو سعة الغاز للبيع بحلول 2030، ومقداره محجوب لتعارض صياغته مع الأصل.\n3. الحفاظ على السعة القصوى المستدامة للنفط.\n\nكلها خطط، لا نتائج، وكلها محجوبة.",
      [
        claim("aramco-capex-guidance-2026"),
        claim("aramco-sales-gas-growth-2030"),
        claim("aramco-msc-12mbd"),
      ],
    ),
    P(
      "rk-mgmt-contingency-view",
      "management_plan",
      ["risks"],
      "لا تتوقع الإدارة تعديلات جوهرية من المسائل محل النزاع. هذا تقدير إدارة، لا نتيجة متحققة.",
      [claim("aramco-contingencies-management-view")],
    ),

    // ── التفسير البحثي
    P(
      "rk-int-operational",
      "research_interpretation",
      ["risks", "operations"],
      "المخاطر التشغيلية: تتركز في تنفيذ مشاريع الغاز وبلوغها طاقتها، وفي موثوقية الإمداد من أصول كبيرة مترابطة. عقود الحد الأدنى للحجم تحوّل أي تأخر إنتاجي إلى كلفة ثابتة.",
      [
        claim("aramco-project-milestones-2025"),
        claim("aramco-jafurah-midstream-contract"),
        claim("aramco-hydrocarbon-risk-factors"),
      ],
    ),
    P(
      "rk-int-financial",
      "research_interpretation",
      ["risks", "financials", "dividends_actions"],
      "المخاطر المالية: تتقاطع ثلاثة استخدامات للنقد، التوزيعات بمكونها الأساسي المتكرر، والإنفاق الرأسمالي الموجّه، والالتزامات القائمة (الحفارات، والتعرفة، ودعم المشاريع المشتركة). في سنوات الأسعار المنخفضة يضيق هامش التدفق الحر بينها. قياس هذا الضيق محجوب.",
      [
        metric("base_dividends_paid"),
        claim("aramco-capex-guidance-2026"),
        claim("aramco-rig-purchase-commitments"),
        claim("aramco-sadara-petro-rabigh-support"),
      ],
    ),
    P(
      "rk-int-sector",
      "research_interpretation",
      ["risks", "industry", "esg"],
      "المخاطر القطاعية: دورية هوامش التكرير والكيماويات، ومسار الطلب على النفط على المدى الطويل. مؤشرات الكثافة الكربونية جزء من تقييم هذا الخطر، لكن الحزمة لا تقارنها بنظراء ولا تحكم على مستواها.",
      [
        metric("downstream_ebit", "annual", { segment: "Downstream" }),
        metric("upstream_carbon_intensity"),
        claim("aramco-hydrocarbon-risk-factors"),
      ],
    ),
    P(
      "rk-int-geopolitical",
      "research_interpretation",
      ["risks"],
      "المخاطر الجيوسياسية: تركز الأصول في المملكة، مع الربط بقرارات الإنتاج، يجعل الأحداث الإقليمية وقرارات سياسة الإنتاج أهم من مخاطر الطلب قصيرة الأجل في بعض الفترات. التفسير غير معتمد، ولا يقيس احتمالًا أو أثرًا.",
      [claim("aramco-hydrocarbon-risk-factors"), { t: "engine_profile", field: "country" }],
    ),

    // ── الافتراضات (لا أرقام)
    P(
      "rk-asm-fiscal",
      "assumption",
      ["forecasts", "financials"],
      "افتراض لازم لأي توقع لاحق: بقاء نظام الإتاوات والضرائب على هيكله الحالي خلال أفق التحليل. الافتراض غير معتمد، والهيكل نفسه غير مربوط بموضع أصلي.",
      [metric("royalties_and_other_taxes")],
    ),
    P(
      "rk-asm-production",
      "assumption",
      ["forecasts", "operations"],
      "افتراض: مستوى الإنتاج متغير خارجي تحدده قرارات الإنتاج، لا متغير يختاره التحليل. يُعامل كمدخل سيناريو، لا كتوقع.",
      [claim("aramco-hydrocarbon-risk-factors"), claim("aramco-msc-12mbd")],
    ),
    P(
      "rk-asm-jv",
      "assumption",
      ["risks"],
      "افتراض: ترتيبات دعم صدارة وبترورابغ لا تُستدعى خلال أفق التحليل. تغيّر هذا الافتراض يغير قراءة التدفقات والديون.",
      [claim("aramco-sadara-petro-rabigh-support")],
    ),

    // ── السيناريوهات النوعية (ليست نتائج ولا توقعات)
    P(
      "rk-sc-price",
      "scenario",
      ["forecasts", "risks"],
      "سيناريو أسعار منخفضة: يتراجع أولًا ربح التنقيب والإنتاج والمكون المرتبط بالأداء في التوزيعات، ثم يضيق التدفق الحر أمام الإنفاق الموجّه. ليس توقعًا، ولا يُقدَّر أثره.",
      [
        metric("average_realized_crude_oil_price"),
        metric("performance_linked_dividends_paid"),
        claim("aramco-capex-guidance-2026"),
      ],
    ),
    P(
      "rk-sc-production",
      "scenario",
      ["forecasts", "operations"],
      "سيناريو رفع الإنتاج نحو السعة: تُستخدم الطاقة الفائضة، فترتفع الكميات وقد تنخفض الأسعار. صافي الأثر غير محدد الاتجاه دون نموذج مؤهل.",
      [claim("aramco-msc-12mbd"), metric("total_liquids_production")],
    ),
    P(
      "rk-sc-gas",
      "scenario",
      ["forecasts"],
      "سيناريو تأخر برنامج الغاز أو عدم تحقق شروطه (الطلب، وقرارات الاستثمار): يبقى مزيج الإيرادات معتمدًا على الخام، وتبقى التزامات الحد الأدنى للحجم قائمة.",
      [claim("aramco-sales-gas-growth-2030"), claim("aramco-jafurah-midstream-contract")],
    ),
    P(
      "rk-sc-downstream",
      "scenario",
      ["forecasts", "industry"],
      "سيناريو انضغاط هوامش التكرير والكيماويات: يتأثر ربح القطاع وحصة الربح من المشاريع المشتركة، وقد تزيد الحاجة إلى ترتيبات الدعم.",
      [
        metric("downstream_ebit", "annual", { segment: "Downstream" }),
        metric("share_of_profit_associates"),
        claim("aramco-sadara-petro-rabigh-support"),
      ],
    ),
  ],
};

/** موضوعات لا يتوفر لها دليل كافٍ؛ تُذكر الفجوة صراحة بدل ملئها. */
export const COVERAGE_GAPS: Section = {
  id: "coverage-gaps",
  title: { ar: "موضوعات بلا دليل كافٍ", en: "Topics without sufficient evidence" },
  paragraphs: [
    P(
      "cg-competitors",
      "gap",
      ["competitors", "industry"],
      "المنافسون والحصة السوقية: لا نظراء بحقائق قابلة للمقارنة في اللقطة. أي مقارنة تكلفة أو عائد مع شركات متكاملة أخرى محجوبة.",
      [{ t: "engine_capability", name: "peer_comparison" }],
    ),
    P(
      "cg-trading",
      "gap",
      ["trading"],
      "التداول والسيولة: سجل السوق جزئي ويحتاج تغذية سوقية مرخصة. لا تحليل تداول.",
      [{ t: "engine_capability", name: "market_history" }],
    ),
    P(
      "cg-valuation",
      "gap",
      ["valuation"],
      "التقييم: لا تقييم في هذه الحزمة، لا DCF ولا مضاعفات. المدخلات غير مؤهلة، وسعر السوق جزئي. التقييم خارج النطاق المصرح به.",
      [
        { t: "engine_capability", name: "market_history" },
        metric("free_cash_flow", "history_annual"),
      ],
    ),
    P(
      "cg-analysts",
      "gap",
      ["analysts"],
      "تغطية المحللين: توقعات الإجماع غير متاحة، وتحتاج تغذية مرخصة.",
      [{ t: "engine_capability", name: "consensus" }],
    ),
    P(
      "cg-news",
      "gap",
      ["news"],
      "الأخبار ومواد المستثمرين: لا تغذية أخبار مصرح بها. المادة المتاحة هي إفصاحات المحرك وسجل الوثائق في B03.",
      [
        { t: "engine_capability", name: "news" },
        { t: "b03_event", id: "evt-fy2025-results" },
      ],
    ),
  ],
};
