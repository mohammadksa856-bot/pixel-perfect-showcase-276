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
      "تركّز الملكية في الدولة والحيازات الإستراتيجية يجعل التوزيعات قناة مهمة لتحويل التدفقات النقدية إلى الدولة بوصفها مالكًا مباشرًا. هذه التوزيعات تختلف عن موارد الدولة الأخرى من الشركة، كالإتاوات والضرائب، وعن حصص الحيازات الإستراتيجية الأخرى. لذلك تُقرأ قرارات التوزيع وإعادة الشراء مع التدفقات النقدية والإنفاق الاستثماري معًا. التفسير غير معتمد، ولا يقيس حجم هذا الأثر.",
      [
        { t: "engine_ownership", holder: "saudi_government_direct" },
        { t: "engine_ownership", holder: "other_strategic" },
        claim("aramco-q4-2025-base-dividend"),
        claim("aramco-buyback-2026"),
        metric("royalties_and_other_taxes"),
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
      "يحمل سجل المحرك ثلاث هويات إنتاج لعام 2025: مجموع السوائل (مليون برميل يوميًا، ويشمل الخام والمكثفات وسوائل الغاز وفق ملاحظة المراجع على حاشية الأصل)، والغاز (مليار قدم مكعبة قياسية يوميًا)، ومجموع الهيدروكربونات (مليون برميل مكافئ يوميًا). مصدرها جدول إنتاج التنقيب والإنتاج في التقرير السنوي، والقيم في Marefa Data. لا هوية لإنتاج الخام وحده في اللقطة.",
      [
        metric("total_liquids_production"),
        metric("total_gas_production"),
        metric("total_hydrocarbon_production"),
        { t: "external_review", id: "B04_LIQUIDS_SCOPE" },
      ],
    ),
    P(
      "up-spare",
      "research_interpretation",
      ["operations", "risks"],
      "السعة القصوى المستدامة هدف للنفط الخام وحده. أما هوية الإنتاج المتاحة في سجل المحرك فهي «مجموع السوائل»، وتشمل الخام والمكثفات وسوائل الغاز، كما نبّه المراجع المستقل إلى حاشية جدول الإنتاج في الأصل. لذلك لا تقيس المقارنة بينهما الطاقة الفائضة. القياس يحتاج إنتاج الخام وحده، بالفترة نفسها وتعريف التوفر نفسه، وهو غير متاح. ما يمكن قوله نوعيًا: عوامل المخاطر المعلنة تذكر «قرارات الحكومة بشأن الإنتاج» بين محددات النتائج، فحجم إنتاج الخام لا تحدده السعة وحدها.",
      [
        claim("aramco-msc-12mbd"),
        claim("aramco-hydrocarbon-risk-factors"),
        metric("total_liquids_production"),
        { t: "external_review", id: "B04_LIQUIDS_SCOPE" },
      ],
    ),
    P(
      "up-unit-costs",
      "reported_record",
      ["operations", "earnings_quality"],
      "يحمل سجل المحرك مؤشرين لكلفة الوحدة في التنقيب والإنتاج لعام 2025، بالدولار لكل برميل مكافئ: كلفة الرفع، والإنفاق الرأسمالي للقطاع. الإنفاق لكل برميل نقد مستثمر، لا كلفة كاملة للبرميل ولا مصروف في قائمة الدخل. ووحدات المؤشرين تحتاج مطابقة مع حواشيها الأصلية.",
      [metric("lifting_cost_per_boe"), metric("upstream_capex_per_boe")],
    ),
    P(
      "up-margin-logic",
      "research_interpretation",
      ["operations", "financials", "competitors"],
      "ربحية الإنتاج في التنقيب والإنتاج تتأثر بعدة محركات: السعر المحقق، وكلفة الرفع، والإهلاك والاستنفاد، والإتاوات والضرائب الأخرى، ثم ضرائب الدخل والزكاة. لكنها لا تُجمع في معادلة واحدة لربح البرميل: السعر بالدولار لبرميل الخام، وكلفة الرفع بالدولار لبرميل مكافئ يشمل الغاز، والإتاوات بند موحد بالريال للمجموعة. والإنفاق الرأسمالي لكل برميل نقد مستثمر، لا مصروف. أي حساب لهامش البرميل يحتاج أولًا تحديد المقياس (مساهمة نقدية، أو ربح القطاع، أو صافي الربح)، ونطاق المنتج، والعملة، والمقام، وجسرًا كاملًا للتكاليف والضرائب. ولا يُحكم على موقع الكلفة مقارنة بالمنافسين: لا نظراء بحقائق قابلة للمقارنة في اللقطة.",
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
      "استحوذت الشركة على حصة إضافية نسبتها 22.5% في بترورابغ (إجراء شركة في سجل المحرك). الادعاء محجوب: صفحة المحرك تخالف صفحة المراجع المستقل، وتاريخ السريان القانوني غير مثبت. والنسبة وحدها لا تثبت السيطرة ولا أساس التوحيد.",
      [
        claim("aramco-petro-rabigh-stake-2025"),
        { t: "b03_event", id: "evt-petro-rabigh-2025" },
        { t: "external_review", id: "B04_PETRO_RABIGH_CONTROL" },
      ],
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
      "أرباح التكرير والكيماويات تتأثر بعدة عوامل: الفرق بين كلفة اللقيم وأسعار المنتجات، والكميات المعالجة مقارنة بالطاقة، ومزيج المنتجات، وكلفة الطاقة والتشغيل، والإهلاك. لا يحدد أي منها الربح وحده، ولا يُختصر الربح في الفرق مضروبًا في الاستغلال. الكيماويات دورية الهامش عادةً. جزء من التعرض في مشاريع مشتركة وشركات زميلة مثل صدارة؛ ووضع بترورابغ المحاسبي بعد الحصة الإضافية غير محدد في الأدلة. ما يُحسب بحقوق الملكية تظهر نتائجه في «حصة الربح من الشركات الزميلة» لا في إيرادات القطاع الموحدة، وترتيبات الدعم في إيضاح الالتزامات المحتملة.",
      [
        metric("downstream_ebit", "annual", { segment: "Downstream" }),
        metric("downstream_crude_utilization"),
        metric("share_of_profit_associates"),
        claim("aramco-sadara-petro-rabigh-support"),
        { t: "external_review", id: "B04_PETRO_RABIGH_CONTROL" },
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
      "يحمل سجل المحرك نتائج القطاعات لعام 2025: الإيرادات، والأرباح قبل الفوائد والضرائب، والمعدلة منها، والإنفاق الرأسمالي، والإهلاك، للتنقيب والإنتاج وللتكرير؛ والإيرادات والأرباح والإنفاق للقطاع المؤسسي. إيرادات القطاع في هذه الهويات تشمل ما بين القطاعات والإيرادات الأخرى المرتبطة بالمبيعات، وفق ملاحظة المراجع على الأصل، فلا تُجمع لتساوي الإيرادات الموحدة.",
      [
        metric("upstream_revenue", "annual", { segment: "Upstream" }),
        metric("downstream_revenue", "annual", { segment: "Downstream" }),
        metric("corporate_revenue", "annual", { segment: "Corporate" }),
        metric("upstream_ebit", "annual", { segment: "Upstream" }),
        metric("downstream_ebit", "annual", { segment: "Downstream" }),
        metric("corporate_ebit", "annual", { segment: "Corporate" }),
        metric("upstream_adjusted_ebit", "annual", { segment: "Upstream" }),
        metric("downstream_adjusted_ebit", "annual", { segment: "Downstream" }),
        metric("upstream_capex", "annual", { segment: "Upstream" }),
        metric("downstream_capex", "annual", { segment: "Downstream" }),
        metric("corporate_capex", "annual", { segment: "Corporate" }),
        metric("upstream_depreciation_amortization", "annual", { segment: "Upstream" }),
        metric("downstream_depreciation_amortization", "annual", { segment: "Downstream" }),
        { t: "external_review", id: "B04_SEGMENT_REVENUE_SCOPE" },
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
      "على مستوى كل تيار منتج، يمكن تفكيك الإيراد مفهوميًا إلى كميات مبيعة وأسعار محققة. لكن ذلك ليس معادلة واحدة للمجموعة: مزيج المنتجات، والإيرادات الأخرى المرتبطة بالمبيعات، والفصل بين المبيعات الخارجية وما بين القطاعات، والمشتريات للتجارة، كلها تؤثر. بند «المشتريات» يرتفع مع نشاط التجارة والتكرير دون أن يعني ربحًا أعلى. والإتاوات والضرائب الأخرى تقتطع جزءًا من القيمة قبل الربح التشغيلي. لذلك نمو الإيرادات وحده لا يدل على نمو الأرباح. الحزمة لا تحدد حصة كل قطاع من الأرباح؛ قياسها محجوب حتى تتأهل أرباح القطاعات وتُطابَق مع الربح الموحد والاستبعادات.",
      [
        metric("revenue_by_product", "annual", { product: "Crude oil" }),
        metric("purchases"),
        metric("royalties_and_other_taxes"),
        metric("upstream_ebit", "annual", { segment: "Upstream" }),
        b02("segment_ebit"),
        { t: "external_review", id: "B04_SEGMENT_REVENUE_SCOPE" },
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
      "يظهر التكامل في الأدلة عبر ثلاث قنوات:\n1. الإيرادات بين القطاعات تشير إلى تحويلات داخلية، على الأرجح من التنقيب والإنتاج إلى التكرير والكيماويات، دون تفصيل للمنتجات المحوّلة.\n2. ترتيب جافورة للمعالجة: وفق ملاحظة المراجع على الإيضاح الأصلي، تحتفظ المجموعة بملكية الأصول وسيطرتها التشغيلية، والمتحصلات المقدمة تُعرض حقوقًا لغير المسيطرين عند التوحيد. فلا يُستنتج أن إنفاقًا رأسماليًا تحوّل إلى مصروف تشغيلي. يلزم الفصل بين تدفقات الشركة الأم، وتعرفة الشركة التابعة، والتوحيد، والتوزيعات لغير المسيطرين.\n3. التوريد والتجارة يربطان الإنتاج بالأسواق.\n\nقد يساعد التكامل على تصريف الإنتاج، لكن ذلك غير مقيس هنا. وأسعار التحويل الداخلية تحدد في أي قطاع يظهر الربح.",
      [
        b02("intersegment_revenue"),
        claim("aramco-jafurah-midstream-contract"),
        profile("business_segments"),
        { t: "external_review", id: "B04_JAFURAH_NOTE34" },
      ],
    ),
    P(
      "in-transfer-gap",
      "gap",
      ["financials", "earnings_quality"],
      "أساس تسعير التحويلات بين القطاعات ليس في سجل المحرك. وجد المراجع المستقل في إيضاح القطاعات الأصلي أنه على أساس السعر الحر بين أطراف مستقلة، مع تغيير في أساس التسعير اعتبارًا من أكتوبر 2024. هذا موضع محدد غير مربوط بالحزمة. لذلك يبقى تفسير توزيع الأرباح بين القطاعين، والمقارنة قبل التغيير وبعده، ناقصًا حتى يُربط.",
      [b02("intersegment_revenue"), { t: "external_review", id: "B04_TRANSFER_PRICING" }],
    ),

    // ── خريطة المحركات
    P(
      "dr-price",
      "research_interpretation",
      ["financials", "risks"],
      "السعر: متوسط سعر النفط المحقق محرك رئيس لإيرادات الخام وأرباح التنقيب والإنتاج، بافتراض ثبات العوامل الأخرى. أثره على صافي الربح يمر عبر الإتاوات وضرائب الدخل، فلا ينتقل كاملًا. نسبة الانتقال تحتاج تعريفات موثقة لنظامي الإتاوات وضرائب الدخل وأساسيهما.",
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
      "الكمية: السعة القصوى المستدامة تخص الخام وحده، ولا تحد إنتاج الغاز أو سوائله. حجم الخام الفعلي يتحدد جزئيًا بقرارات الإنتاج. وزيادة إنتاج الغاز لا تعني تلقائيًا زيادة المبيعات الخارجية: جزء منه قد يُستهلك داخليًا أو يُحوَّل بين القطاعات. أثرها على الربح لا يتحدد بلا كميات المبيعات الخارجية وسعر الغاز المحقق.",
      [
        claim("aramco-msc-12mbd"),
        metric("total_gas_production"),
        claim("aramco-hydrocarbon-risk-factors"),
        b02("intersegment_revenue"),
        { t: "external_review", id: "B04_LIQUIDS_SCOPE" },
      ],
    ),
    P(
      "dr-margin",
      "research_interpretation",
      ["operations", "financials", "industry"],
      "الهامش: في التكرير والكيماويات، فرق كلفة اللقيم وأسعار المنتجات ومعدل الاستغلال محركان للربح، لا معادلة له. يلزم معهما الكميات والطاقة ومزيج المنتجات وتكاليف الطاقة والتشغيل والإهلاك. نشاط التجارة يرفع الإيرادات والمشتريات معًا. هامشه غير معروف من الهويات المتاحة، فلا يُوصف بأنه منخفض أو مرتفع.",
      [
        metric("downstream_crude_utilization"),
        metric("crude_refined_products_traded"),
        metric("purchases"),
      ],
    ),
    P(
      "dr-capacity",
      "scenario",
      ["operations", "forecasts"],
      "سيناريو الطاقة: بدء إنتاج جافورة وهدف نمو سعة الغاز للبيع قد يرفعان وزن الغاز وسوائله في الإيرادات، إذا تحولت الكميات الإضافية إلى مبيعات خارجية وكانت الأسعار النسبية بين النفط والغاز مواتية. ليس اتجاهًا مثبتًا: الاستخدام الداخلي، والأسعار النسبية، والتنفيذ، والتوحيد قد تعكس الأثر. الهدف نفسه محجوب لتعارض صياغته مع الأصل.",
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
