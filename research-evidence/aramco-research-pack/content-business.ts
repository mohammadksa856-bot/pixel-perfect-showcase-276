/**
 * WEB-08B04 — نطاق الحزمة ونموذج الأعمال. كل فقرة مسنودة بمراجع قابلة للحل؛ لا أرقام مالية.
 * القاعدة اللغوية: «سجل المحرك» = ما تقوله اللقطة المجمدة عن المُصدر، لا نص المستند الأصلي.
 */
import type { Paragraph, Ref, Section } from "./schema";

export const P = (
  id: string,
  kind: Paragraph["kind"],
  topics: Paragraph["topics"],
  ar: string,
  refs: Ref[],
  extra: Partial<Pick<Paragraph, "en" | "metaNumbers">> = {},
): Paragraph => ({
  id,
  kind,
  topics,
  ar,
  en: extra.en ?? null,
  refs,
  ...(extra.metaNumbers ? { metaNumbers: extra.metaNumbers } : {}),
});

export const claim = (id: string): Ref => ({ t: "b03_claim", id });
export const metric = (
  key: string,
  bucket: Extract<Ref, { t: "engine_metric" }>["bucket"] = "annual",
  dims?: Record<string, string>,
): Ref => ({ t: "engine_metric", key, bucket, ...(dims ? { dims } : {}) });
export const profile = (field: string): Ref => ({ t: "engine_profile", field });
export const b02 = (m: string): Ref => ({ t: "b02_withheld", metric: m });

export const SCOPE: Section = {
  id: "scope",
  title: { ar: "نطاق الحزمة وحدودها", en: "Scope and limits of this pack" },
  paragraphs: [
    P(
      "scope-what",
      "methodology",
      ["news"],
      "هذه أول حزمة بحث استثماري متعمق عن أرامكو السعودية (2222). مادتها ثلاثة مصادر: اللقطة المجمدة المقبولة من المحرك (2026-10-13)، وسجل الإفصاحات WEB-08B03 المقبول هندسيًا، وسجل الأدلة WEB-08B02. ليست اعتمادًا ماليًا ولا تحريريًا. الادعاءات البحثية الـ22 والمدخلات المالية الـ142 تبقى محجوبة. لا تحمل الحزمة أي رقم مالي من المحرك؛ الأرقام تُقرأ في Marefa Data عبر الروابط.",
      [{ t: "external_review", id: "CODEX_B03_ACCEPT" }, b02("revenue")],
      {
        metaNumbers: ["22", "142"],
        en: "First in-depth investment research pack on Saudi Aramco (2222), built on the accepted frozen engine snapshot (2026-10-13), the WEB-08B03 disclosure register (engineering-accepted) and the WEB-08B02 evidence register. It is not a financial or editorial approval. The 22 research claims and the 142 financial inputs stay withheld. The pack holds no engine financial figure; figures are read in Marefa Data through links.",
      },
    ),
    P(
      "scope-kinds",
      "methodology",
      ["news"],
      "لكل فقرة نوع يحدد حالتها، ولا نوع يؤدي إلى «معتمد»: سجل المحرك (WITHHELD)، وخطة إدارة (WITHHELD، مستقبلية لا نتيجة)، وتفسير بحثي، وافتراض، وسيناريو نوعي (كلها غير معتمدة)، وطريقة تحليل (بانتظار الاعتماد)، وفجوة. التحليلات الكمية مُعرَّفة ومحجوبة (BLOCKED) حتى تتأهل مدخلاتها.",
      [{ t: "external_review", id: "CODEX_B03_ACCEPT" }],
      {
        en: "Each paragraph has a kind that fixes its status; no kind yields 'approved': engine record (WITHHELD), management plan (WITHHELD, forward-looking, not a result), research interpretation, assumption and qualitative scenario (all unapproved), methodology (pending approval), and gap. Quantitative analyses are defined and BLOCKED until their inputs qualify.",
      },
    ),
    P(
      "scope-originals",
      "gap",
      ["news"],
      "لم يطّلع مؤلف الحزمة على المستندات الأصلية: الشبكة في بيئته تحجب موقع الناشر. نص «سجل المحرك» مقتطف من اللقطة ولم يُطابَق حرفيًا مع الأصل. ملاحظات المراجع المستقل على الأصل (المواضع، وتعارض هدف الغاز، ومصدر التوجيه الرأسمالي) طبقة مراجعة، لا تحقق.",
      [
        { t: "external_review", id: "GAS_TARGET" },
        { t: "external_review", id: "CAPITAL_INVESTMENT_GUIDANCE" },
        claim("aramco-sales-gas-growth-2030"),
      ],
    ),
  ],
};

export const BUSINESS: Section = {
  id: "business-model",
  title: { ar: "نموذج الأعمال", en: "Business model" },
  paragraphs: [
    // ── الشركة
    P(
      "bm-identity",
      "reported_record",
      ["identity"],
      "شركة الزيت العربية السعودية شركة مساهمة سعودية مقرها الظهران، مدرجة في السوق المالية السعودية منذ 2019، وتعدّ قوائمها وفق معايير IFRS المعتمدة في المملكة. هذا ما يسجله ملف التعريف في المحرك.",
      [
        profile("legal_name"),
        profile("legal_form"),
        profile("headquarters_address"),
        profile("listing_date"),
        profile("reporting_standard"),
      ],
    ),
    P(
      "bm-description",
      "reported_record",
      ["business"],
      "تصف الشركة نفسها بأنها شركة طاقة وكيميائيات متكاملة عالميًا، تعمل عبر قطاعين تشغيليين، التنقيب والإنتاج (Upstream) والتكرير والكيميائيات والتسويق (Downstream)، تدعمهما التقنية والخدمات المؤسسية. يذكر سجل المحرك حضورًا في أكثر من 50 دولة، و400 شركة تابعة ومشروع مشترك وشركة زميلة على الأقل.",
      [
        profile("business_description"),
        profile("business_description_ar"),
        profile("geographic_presence"),
        profile("subsidiaries_count"),
      ],
    ),
    P(
      "bm-ownership",
      "reported_record",
      ["ownership", "governance"],
      "يقسّم سجل الملكية (كما في نهاية 2025) المساهمين إلى أربع فئات: حكومة المملكة مالكًا مباشرًا، وحيازات إستراتيجية أخرى منها حيازات مرتبطة بصندوق الاستثمارات العامة، والمساهمون من الجمهور، وأسهم الخزينة. النسب وأعداد الأسهم لا تُنقل هنا، وتُقرأ في تبويب المساهمين في Marefa Data.",
      [
        { t: "engine_ownership", holder: "saudi_government_direct" },
        { t: "engine_ownership", holder: "other_strategic" },
        { t: "engine_ownership", holder: "public" },
        { t: "engine_ownership", holder: "treasury" },
      ],
    ),
    P(
      "bm-ownership-interp",
      "research_interpretation",
      ["ownership", "governance", "dividends_actions"],
      "تركّز الملكية في الدولة والحيازات الإستراتيجية يجعل سياسة التوزيعات قناة رئيسة لتحويل التدفقات النقدية إلى الدولة بوصفها مالكًا مباشرًا. لذلك تُقرأ قرارات التوزيع وإعادة الشراء مع التدفقات النقدية والإنفاق الاستثماري معًا، لا منفصلة. التفسير غير معتمد، ولا يقيس حجم هذا الأثر.",
      [
        { t: "engine_ownership", holder: "saudi_government_direct" },
        claim("aramco-q4-2025-base-dividend"),
        claim("aramco-buyback-2026"),
      ],
    ),
    P(
      "bm-governance",
      "reported_record",
      ["governance"],
      "يسجل ملف التعريف رئيس مجلس الإدارة (ياسر الرميان) والرئيس التنفيذي (أمين الناصر)، ومراجع الحسابات PwC.",
      [profile("chairman_name"), profile("ceo_name"), profile("auditor")],
    ),
    P(
      "bm-rating",
      "reported_record",
      ["risks", "identity"],
      "يسجل ملف التعريف تصنيفًا ائتمانيًا طويل الأجل Aa3 من موديز وA+ من فيتش، بنظرة مستقرة لدى الوكالتين. هذه بيانات سجل، لا تقييم بحثي لملاءة الشركة.",
      [profile("credit_rating")],
    ),

    // ── التنقيب والإنتاج
    P(
      "up-scope",
      "reported_record",
      ["business", "operations"],
      "يضم قطاع التنقيب والإنتاج، بحسب سجل المحرك، أربعة أنشطة: النفط الخام والمكثفات، والغاز الطبيعي، وسوائل الغاز الطبيعي، والاستكشاف والإنتاج. منتجات الشركة المعلنة تمتد من هذه إلى المنتجات المكررة والكيماويات وزيوت الأساس ووقود التجزئة والتجارة والكهرباء.",
      [profile("business_segments"), profile("products_services")],
    ),
    P(
      "up-msc",
      "management_plan",
      ["operations", "forecasts"],
      "تستهدف الإدارة الحفاظ على سعة إنتاج قصوى مستدامة من النفط الخام عند 12 مليون برميل يوميًا. هذه سعة، لا إنتاج فعلي، والجملة لا تحدد تاريخًا. المراجع المستقل أيّد المعنى ولم يعتمده.",
      [claim("aramco-msc-12mbd")],
    ),
    P(
      "up-volumes",
      "reported_record",
      ["operations"],
      "يحمل سجل المحرك ثلاث هويات إنتاج لعام 2025: السوائل (مليون برميل يوميًا)، والغاز (مليار قدم مكعبة قياسية يوميًا)، ومجموع الهيدروكربونات (مليون برميل مكافئ يوميًا). مصدرها جدول إنتاج التنقيب والإنتاج في التقرير السنوي، والقيم في Marefa Data.",
      [
        metric("total_liquids_production"),
        metric("total_gas_production"),
        metric("total_hydrocarbon_production"),
      ],
    ),
    P(
      "up-spare",
      "research_interpretation",
      ["operations", "risks"],
      "الفرق بين السعة القصوى المستدامة والإنتاج الفعلي من السوائل هو طاقة فائضة. تذكر عوامل المخاطر المعلنة «قرارات الحكومة بشأن الإنتاج» بين محددات النتائج. معنى ذلك أن حجم الإنتاج متغير سياسات جزئيًا، لا سقف سعة فقط. أثر الكميات على الإيرادات يُقرأ إذن مع قرارات الإنتاج، لا مع السعة وحدها. قياس الطاقة الفائضة محجوب: يحتاج قيمتي السعة والإنتاج مؤهلتين.",
      [
        claim("aramco-msc-12mbd"),
        claim("aramco-hydrocarbon-risk-factors"),
        metric("total_liquids_production"),
      ],
    ),
    P(
      "up-unit-costs",
      "reported_record",
      ["operations", "earnings_quality"],
      "يحمل سجل المحرك مؤشرين لكلفة الوحدة في التنقيب والإنتاج لعام 2025، بالدولار لكل برميل مكافئ: كلفة الرفع، والإنفاق الرأسمالي للقطاع. مصدرهما جدول أداء القطاع.",
      [metric("lifting_cost_per_boe"), metric("upstream_capex_per_boe")],
    ),
    P(
      "up-margin-logic",
      "research_interpretation",
      ["operations", "financials", "competitors"],
      "ربح البرميل في التنقيب والإنتاج هو السعر المحقق ناقص كلفة الرفع والإهلاك وحصة الإتاوات والضرائب الأخرى. كلفة الرفع والإنفاق لكل برميل يحددان موقع الشركة على منحنى الكلفة، ومدى تحمّلها لانخفاض الأسعار. المقارنة بالمنافسين غير ممكنة هنا: ليس في اللقطة نظراء بحقائق قابلة للمقارنة.",
      [
        metric("average_realized_crude_oil_price"),
        metric("lifting_cost_per_boe"),
        metric("royalties_and_other_taxes"),
        { t: "engine_capability", name: "peer_comparison" },
      ],
    ),
    P(
      "up-reserves-gap",
      "gap",
      ["operations"],
      "مؤشر عمر الاحتياطيات في المحرك مشتق محسوب غير معتمد. أحجام الاحتياطيات نفسها ليست في اللقطة كحقائق مراجَعة. أي تحليل يقوم على الاحتياطيات محجوب.",
      [metric("reserve_life_index")],
    ),

    // ── التكرير والكيماويات والتسويق
    P(
      "dn-scope",
      "reported_record",
      ["business", "industry"],
      "يضم قطاع التكرير والكيميائيات والتسويق، بحسب سجل المحرك، سبعة أنشطة: التكرير، والكيماويات، وزيوت الأساس ومواد التشحيم، والتجزئة، وخطوط الأنابيب والمحطات، والتوريد والتجارة، والكهرباء.",
      [profile("business_segments")],
    ),
    P(
      "dn-volumes",
      "reported_record",
      ["operations"],
      "يحمل سجل المحرك خمس هويات تشغيلية للقطاع لعام 2025، من قسم نموذج أعمال التكرير وأحجامه: معدل استغلال الخام، ومبيعات زيوت الأساس، ومبيعات مواد التشحيم الجاهزة، وحجم الخام والمنتجات المكررة المتداولة، وحجم الكيماويات السائلة المتداولة.",
      [
        metric("downstream_crude_utilization"),
        metric("base_oils_sold"),
        metric("finished_lubricants_sold"),
        metric("crude_refined_products_traded"),
        metric("liquid_chemicals_traded"),
      ],
    ),
    P(
      "dn-petro-rabigh",
      "reported_record",
      ["dividends_actions", "business"],
      "استحوذت الشركة على حصة إضافية نسبتها 22.5% في بترورابغ (إجراء شركة في سجل المحرك). الادعاء محجوب: صفحة المحرك تخالف صفحة المراجع المستقل، وتاريخ السريان القانوني غير مثبت.",
      [claim("aramco-petro-rabigh-stake-2025"), { t: "b03_event", id: "evt-petro-rabigh-2025" }],
    ),
    P(
      "dn-jv-support",
      "reported_record",
      ["risks", "business"],
      "يصف إيضاح الالتزامات المحتملة ترتيبات دعم وضمان تخص صدارة وبترورابغ، دون مبلغ مجمّع منشور.",
      [claim("aramco-sadara-petro-rabigh-support")],
    ),
    P(
      "dn-held-for-sale",
      "reported_record",
      ["business", "financials"],
      "تتضمن هويات المدخلات في سجل B02 نقدًا مصنفًا ضمن مجموعة استبعاد محتفظ بها للبيع باسم PRefChem. طبيعة الصفقة وشروطها ليست في الأدلة المتاحة، والقيمة محجوبة ضمن المدخلات الـ142.",
      [b02("cash_held_for_sale")],
      { metaNumbers: ["142"] },
    ),
    P(
      "dn-earnings-logic",
      "research_interpretation",
      ["business", "financials", "risks", "industry"],
      "ربح التكرير والكيماويات هامش بين كلفة اللقيم وأسعار المنتجات، مضروب في معدل الاستغلال. الكيماويات خصوصًا دورية الهامش. جزء من التعرض يقع في مشاريع مشتركة وزميلة (صدارة وبترورابغ). أثر هذا الجزء يظهر في «حصة الربح من الشركات الزميلة» وفي إيضاح الالتزامات المحتملة، لا في إيرادات القطاع الموحدة وحدها. قياس الهامش وحساسيته محجوب.",
      [
        metric("downstream_ebit", "annual", { segment: "Downstream" }),
        metric("downstream_crude_utilization"),
        metric("share_of_profit_associates"),
        claim("aramco-sadara-petro-rabigh-support"),
      ],
    ),

    // ── كيف تتولد الإيرادات والأرباح
    P(
      "rv-product",
      "reported_record",
      ["financials"],
      "يقسم سجل المحرك إيرادات 2025 حسب نوع المنتج إلى ثلاثة تيارات: النفط الخام، والغاز الطبيعي وسوائله، والمنتجات المكررة والكيماوية.",
      [
        metric("revenue_by_product", "annual", { product: "Crude oil" }),
        metric("revenue_by_product", "annual", { product: "Natural gas and NGLs" }),
        metric("revenue_by_product", "annual", { product: "Refined and chemical products" }),
      ],
    ),
    P(
      "rv-geography",
      "reported_record",
      ["financials"],
      "ويقسمها جغرافيًا إلى داخل المملكة وخارجها، على أساس موقع الكيان البائع لا موقع العميل.",
      [
        metric("revenue_by_geography", "annual", {
          basis: "location of selling entity",
          geography: "In-Kingdom",
        }),
        metric("revenue_by_geography", "annual", {
          basis: "location of selling entity",
          geography: "Out-of-Kingdom",
        }),
      ],
    ),
    P(
      "rv-geography-reading",
      "research_interpretation",
      ["financials"],
      "لأن التقسيم على أساس الكيان البائع، فالمبيعات عبر كيانات تجارية خارج المملكة تُحسب «خارجها» وإن كان مصدر البرميل محليًا. لا يصلح التقسيم إذن مقياسًا للطلب المحلي مقابل التصدير دون إيضاح إضافي.",
      [
        metric("revenue_by_geography", "annual", {
          basis: "location of selling entity",
          geography: "Out-of-Kingdom",
        }),
      ],
    ),
    P(
      "rv-segments",
      "reported_record",
      ["financials"],
      "يحمل سجل المحرك نتائج القطاعات لعام 2025: الإيرادات، والأرباح قبل الفوائد والضرائب، والمعدلة منها، والإنفاق الرأسمالي، والإهلاك، للتنقيب والإنتاج وللتكرير؛ والإيرادات والأرباح والإنفاق للقطاع المؤسسي.",
      [
        metric("upstream_revenue", "annual", { segment: "Upstream" }),
        metric("downstream_revenue", "annual", { segment: "Downstream" }),
        metric("corporate_revenue", "annual", { segment: "Corporate" }),
        metric("upstream_ebit", "annual", { segment: "Upstream" }),
        metric("downstream_ebit", "annual", { segment: "Downstream" }),
        metric("corporate_ebit", "annual", { segment: "Corporate" }),
        metric("upstream_adjusted_ebit", "annual", { segment: "Upstream" }),
        metric("downstream_adjusted_ebit", "annual", { segment: "Downstream" }),
      ],
    ),
    P(
      "rv-cost-lines",
      "reported_record",
      ["financials", "earnings_quality"],
      "بنود الكلفة في قائمة الدخل كما يسجلها المحرك: الإتاوات والضرائب الأخرى، والمشتريات، ومصاريف الإنتاج والتصنيع، والمصاريف البيعية والعمومية والإدارية، ومصاريف الاستكشاف، والإهلاك والاستنفاد. تليها ضرائب الدخل والزكاة، ولها جدول تسوية مستقل.",
      [
        metric("royalties_and_other_taxes"),
        metric("purchases"),
        metric("producing_manufacturing_expense"),
        metric("selling_general_administrative_expense"),
        metric("exploration_expense"),
        metric("depreciation_amortization"),
        metric("income_taxes_and_zakat"),
      ],
    ),
    P(
      "rv-mechanics",
      "research_interpretation",
      ["financials", "earnings_quality"],
      "إيرادات التيارات الثلاثة تساوي الكميات المبيعة مضروبة في الأسعار المحققة. بند «المشتريات» يعكس ما تشتريه الشركة من الغير للتجارة والتكرير، فيرتفع مع نشاط التجارة دون أن يعني ربحًا أعلى. الإتاوات والضرائب الأخرى تقتطع جزءًا من قيمة الإنتاج قبل الربح التشغيلي. لذلك نمو الإيرادات وحده لا يدل على نمو الأرباح، ويلزم تحليل الأرباح حسب القطاع. وزن كل قطاع في الأرباح يُقاس من Marefa Data؛ هذه الحزمة لا تحدده.",
      [
        metric("revenue_by_product", "annual", { product: "Crude oil" }),
        metric("purchases"),
        metric("royalties_and_other_taxes"),
        metric("upstream_ebit", "annual", { segment: "Upstream" }),
      ],
    ),
    P(
      "rv-gas-price-gap",
      "gap",
      ["financials", "operations"],
      "لا يحمل سجل المحرك سعرًا محققًا للغاز، بل متوسط السعر المحقق للنفط الخام فقط. بدونه لا يمكن فصل أثر السعر عن أثر الكمية في إيرادات الغاز وسوائله، وهي القناة التي يستهدفها برنامج توسعة الغاز.",
      [metric("natural_gas_revenue"), metric("average_realized_crude_oil_price")],
    ),
    P(
      "rv-royalty-gap",
      "gap",
      ["financials", "risks"],
      "بند الإتاوات موجود، لكن هيكل نسبها وطريقة تغيرها مع الأسعار ليسا في الأدلة المتاحة. أي حساسية للأرباح تجاه السعر تبقى ناقصة دون موضع أصلي لنظام الإتاوات.",
      [metric("royalties_and_other_taxes")],
    ),

    // ── التكامل
    P(
      "in-interseg",
      "reported_record",
      ["business", "financials"],
      "تتضمن هويات المدخلات في سجل B02 إيرادات بين القطاعات للتنقيب والإنتاج والتكرير والقطاع المؤسسي، مع بند استبعادات، وإيرادات خارجية لكل قطاع. أي أن الشركة تفصح عن تحويلات داخلية بين القطاعات تُستبعد عند التوحيد. القيم محجوبة.",
      [b02("intersegment_revenue"), b02("external_revenue")],
    ),
    P(
      "in-midstream",
      "reported_record",
      ["business", "operations"],
      "احتفظت الشركة بحق الاستخدام الحصري لمعمل غاز جافورة ومعمل تجزئة سوائل الغاز في رياس لمدة 20 سنة، بتعرفة ربع سنوية قائمة على الأحجام ومدعومة بالتزامات حد أدنى للحجم. تاريخ بدء المدة غير مذكور في السجل.",
      [claim("aramco-jafurah-midstream-contract")],
    ),
    P(
      "in-channels",
      "research_interpretation",
      ["business", "financials", "risks"],
      "يعمل التكامل عبر ثلاث قنوات تظهر في الأدلة:\n1. إنتاج التنقيب والإنتاج يغذي على الأرجح مصافي الشركة ومجمعاتها الكيماوية. هذا ما تشير إليه الإيرادات بين القطاعات، دون تفصيل المنتجات المحوّلة.\n2. أصول البنية الوسطى قد تُستخدم بعقود تعرفة طويلة، كما في جافورة. هذا يحوّل جزءًا من الإنفاق الرأسمالي إلى التزام تشغيلي طويل الأجل بحد أدنى للحجم.\n3. التوريد والتجارة يربطان الإنتاج بالأسواق.\n\nالتكامل يثبّت تصريف الإنتاج، لكن أسعار التحويل الداخلية تحدد في أي قطاع يظهر الربح.",
      [
        b02("intersegment_revenue"),
        claim("aramco-jafurah-midstream-contract"),
        profile("business_segments"),
      ],
    ),
    P(
      "in-transfer-gap",
      "gap",
      ["financials", "earnings_quality"],
      "أساس تسعير التحويلات بين القطاعات ليس في الأدلة المتاحة. تفسير توزيع الأرباح بين القطاعين يبقى ناقصًا حتى يُربط إيضاح القطاعات الأصلي.",
      [
        b02("intersegment_revenue"),
        metric("upstream_depreciation_amortization", "annual", { segment: "Upstream" }),
      ],
    ),

    // ── خريطة المحركات
    P(
      "dr-price",
      "research_interpretation",
      ["financials", "risks"],
      "السعر: متوسط سعر النفط المحقق محرك رئيس لإيرادات الخام وأرباح التنقيب والإنتاج. أثره على صافي الربح يمر عبر الإتاوات والضرائب، فلا ينتقل كاملًا.",
      [
        metric("average_realized_crude_oil_price"),
        metric("royalties_and_other_taxes"),
        claim("aramco-hydrocarbon-risk-factors"),
      ],
    ),
    P(
      "dr-volume",
      "research_interpretation",
      ["operations", "financials"],
      "الكمية: سقفها السعة القصوى المستدامة، ومستواها الفعلي يتحدد جزئيًا بقرارات الإنتاج. زيادة إنتاج الغاز تضيف كميات إلى تيار الغاز وسوائله، دون أن يتحدد أثرها على الربح بلا سعر غاز محقق.",
      [
        claim("aramco-msc-12mbd"),
        metric("total_gas_production"),
        claim("aramco-hydrocarbon-risk-factors"),
      ],
    ),
    P(
      "dr-margin",
      "research_interpretation",
      ["operations", "financials", "industry"],
      "الهامش: في التكرير والكيماويات، يحدد الربحَ الفرقُ بين كلفة اللقيم وأسعار المنتجات ومعدلُ الاستغلال. أما التجارة فترفع الإيرادات والمشتريات معًا بهامش محدود.",
      [
        metric("downstream_crude_utilization"),
        metric("crude_refined_products_traded"),
        metric("purchases"),
      ],
    ),
    P(
      "dr-capacity",
      "research_interpretation",
      ["operations", "forecasts"],
      "الطاقة: بدء إنتاج جافورة وهدف نمو سعة الغاز للبيع تعيد تدريجيًا توزيع مزيج الإيرادات نحو الغاز وسوائله. الهدف نفسه محجوب لتعارض صياغته مع الأصل.",
      [
        claim("aramco-project-milestones-2025"),
        claim("aramco-sales-gas-growth-2030"),
        { t: "external_review", id: "GAS_TARGET" },
      ],
    ),
    P(
      "dr-sensitivity-blocked",
      "methodology",
      ["financials", "forecasts"],
      "تحليل الحساسية الكمي محجوب، مثل أثر تغير السعر بدولار للبرميل على الأرباح. يحتاج مدخلات مؤهلة: السعر المحقق، والكميات، وهيكل الإتاوات، وأرباح القطاعات. لا شيء منها مؤهل الآن.",
      [
        metric("average_realized_crude_oil_price"),
        b02("segment_ebit"),
        metric("royalties_and_other_taxes"),
      ],
    ),
  ],
};
