/**
 * WEB-08B04 — هيكل البحث المالي. سبعة تحليلات معرَّفة: التعريف المحاسبي، والمدخلات (هويات لا قيم)،
 * وأسئلة البحث، ومحركات نوعية. كل تحليل BLOCKED: لا مدخل مؤهل في هذه المرحلة، والأرقام في Marefa Data.
 */
import { P, b02, claim, metric } from "./content-business";
import type { Analysis, Section } from "./schema";

const U = { segment: "Upstream" };
const D = { segment: "Downstream" };
const C = { segment: "Corporate" };

const ANALYSES: Analysis[] = [
  {
    id: "fa-revenue",
    title: { ar: "الإيرادات حسب النشاط ومحركاتها", en: "Revenue by activity and its drivers" },
    topics: ["financials", "operations"],
    definition: {
      ar: "الإيرادات من العقود مع العملاء وفق IFRS كما تعرضها القوائم: حسب نوع المنتج، والإيرادات الخارجية لكل قطاع، والتقسيم الجغرافي حسب موقع الكيان البائع. هويات «إيرادات القطاع» في المحرك تشمل ما بين القطاعات والإيرادات الأخرى المرتبطة بالمبيعات؛ فلا تُجمع لتساوي الإيرادات الموحدة إلا بمطابقة مع الاستبعادات. والإنتاج ليس كمية المبيعات.",
      basis: "ifrs_line_item",
    },
    inputs: [
      { key: "revenue", bucket: "history_annual" },
      { key: "revenue_by_product", bucket: "annual", dims: { product: "Crude oil" } },
      { key: "revenue_by_product", bucket: "annual", dims: { product: "Natural gas and NGLs" } },
      {
        key: "revenue_by_product",
        bucket: "annual",
        dims: { product: "Refined and chemical products" },
      },
      { key: "upstream_revenue", bucket: "annual", dims: U },
      { key: "downstream_revenue", bucket: "annual", dims: D },
      { key: "average_realized_crude_oil_price", bucket: "annual" },
      { key: "total_liquids_production", bucket: "annual" },
      { key: "total_gas_production", bucket: "annual" },
    ],
    b02Inputs: [
      "revenue",
      "revenue_and_other_income_related_to_sales",
      "external_revenue",
      "intersegment_revenue",
    ],
    questions: [
      "كم من تغير إيرادات الخام بين سنتين يعود إلى السعر المحقق، وكم إلى الكمية؟",
      "ما وزن تيار الغاز وسوائله في الإيرادات، وكيف تغير خلال السنوات الخمس المتاحة؟",
      "كم من الإيرادات الخارجية للتكرير تجارة بهامش منخفض، وكم منتجات مصنعة؟",
    ],
    drivers: [
      P(
        "fa-revenue-d1",
        "research_interpretation",
        ["financials"],
        "إيرادات الخام دالة في السعر المحقق والكمية المبيعة، والكمية المبيعة ليست الإنتاج. إيرادات التكرير تتبع أسعار المنتجات وأحجام التجارة. لذلك قد ترتفع الإيرادات الموحدة مع التجارة دون ارتفاع مماثل في الربح. وأي جمع لإيرادات القطاعات يحتاج مطابقة مع الإيرادات الموحدة والاستبعادات.",
        [
          metric("average_realized_crude_oil_price"),
          metric("crude_refined_products_traded"),
          metric("purchases"),
          b02("intersegment_revenue"),
          { t: "external_review", id: "B04_SEGMENT_REVENUE_SCOPE" },
        ],
      ),
    ],
  },
  {
    id: "fa-profitability",
    title: { ar: "الربحية والهوامش", en: "Profitability and margins" },
    topics: ["financials", "earnings_quality", "ratios"],
    definition: {
      ar: "أربعة مقاييس منفصلة لا تُبدَّل: الربح التشغيلي (قائمة الدخل)، والربح قبل الفوائد والضرائب بتعريف المُصدر (يشمل معالجة دخل التمويل)، والمعدل منه (غير IFRS)، وصافي الربح. ربح القطاعات يُطابَق مع الربح الموحد عبر القطاع المؤسسي والاستبعادات ونتائج المشاريع المشتركة قبل أي حصة. وEBITDA ليس تلقائيًا الربح التشغيلي زائد الإهلاك عبر نطاقات مختلفة. الهوامش نسب للفترة والنطاق نفسيهما. التعريفات تحتاج ربطًا بالأصل.",
      basis: "issuer_non_ifrs",
    },
    inputs: [
      { key: "upstream_ebit", bucket: "annual", dims: U },
      { key: "downstream_ebit", bucket: "annual", dims: D },
      { key: "corporate_ebit", bucket: "annual", dims: C },
      { key: "upstream_adjusted_ebit", bucket: "annual", dims: U },
      { key: "downstream_adjusted_ebit", bucket: "annual", dims: D },
      { key: "operating_income", bucket: "history_annual" },
      { key: "net_income", bucket: "history_annual" },
      { key: "adjusted_net_income", bucket: "annual" },
      { key: "operating_margin", bucket: "history_annual" },
      { key: "net_margin", bucket: "history_annual" },
    ],
    b02Inputs: [
      "operating_income",
      "net_income",
      "net_income_parent",
      "adjusted_net_income",
      "segment_ebit",
    ],
    questions: [
      "ما حصة كل قطاع من الربح التشغيلي، وكيف تغيرت مع السعر المحقق؟",
      "ما البنود التي تفصل الأرباح المعدلة عن المعلنة، وهل تتكرر؟",
      "كم من الربح يقتطعه بند الإتاوات والضرائب الأخرى، ثم ضرائب الدخل والزكاة؟",
    ],
    drivers: [
      P(
        "fa-profitability-d1",
        "research_interpretation",
        ["financials", "earnings_quality"],
        "جودة الأرباح تُقرأ من ثلاثة فروق: بين الربح المعدل والمعلن، وبين ربح القطاعات والربح الموحد (القطاع المؤسسي والاستبعادات ونتائج المشاريع المشتركة)، وبين الربح والتدفق النقدي التشغيلي. ربح القطاع قبل الفوائد والضرائب ليس حصة من الربح التشغيلي الموحد دون جسر بينهما. الهوامش في المحرك مشتقات محسوبة غير معتمدة، فلا تُستخدم كنتائج.",
        [
          metric("upstream_adjusted_ebit", "annual", { segment: "Upstream" }),
          metric("corporate_ebit", "annual", { segment: "Corporate" }),
          metric("net_margin", "history_annual"),
          b02("segment_ebit"),
          { t: "external_review", id: "B04_ISSUER_DEFINITIONS" },
        ],
      ),
    ],
  },
  {
    id: "fa-cash-flow",
    title: { ar: "التدفقات النقدية", en: "Cash flows" },
    topics: ["financials", "earnings_quality"],
    definition: {
      ar: "التدفق النقدي من الأنشطة التشغيلية والاستثمارية والتمويلية كما في قائمة التدفقات. «التدفق النقدي الحر» بتعريف المُصدر = التدفق التشغيلي ناقص الإنفاق الرأسمالي النقدي بوصفه تدفقًا خارجًا موجبًا؛ إن كانت إشارة الإنفاق سالبة في المصدر فلا يُطرح سالب. ليس التدفق الاستثماري ولا توجيه الاستثمار. التغطية مؤشر، لا مصدر تمويل. والنقد في نهاية الفترة يُطابَق مع نقد الميزانية والمحتفظ به للبيع والسحب على المكشوف. القيمة في المحرك مشتقة غير معتمدة.",
      basis: "issuer_non_ifrs",
    },
    inputs: [
      { key: "operating_cash_flow", bucket: "history_annual" },
      { key: "investing_cash_flow", bucket: "annual" },
      { key: "financing_cash_flow", bucket: "annual" },
      { key: "free_cash_flow", bucket: "history_annual" },
      { key: "capex", bucket: "history_annual" },
      { key: "operating_cash_flow", bucket: "history_quarter" },
    ],
    b02Inputs: [
      "operating_cash_flow",
      "capex",
      "cash_flow_end",
      "depreciation_amortization_cash_flow",
    ],
    questions: [
      "هل يغطي التدفق التشغيلي الإنفاق الرأسمالي والتوزيعات معًا في كل سنة من السنوات المتاحة؟",
      "ما أثر تغيرات رأس المال العامل على التدفق التشغيلي، خصوصًا المستحق من الحكومة؟",
    ],
    drivers: [
      P(
        "fa-cash-flow-d1",
        "research_interpretation",
        ["financials", "dividends_actions"],
        "تغطية التدفق الحر للتوزيعات مؤشر، لا اختبار لمصدر تمويلها: النقد قابل للاستبدال، والتمويل وبيع الأصول والاستثمارات والتوقيت والنقد المقيد كلها تؤثر. القراءة السليمة جسر نقدي كامل بإشاراته وتوقيته: التدفق التشغيلي، والإنفاق، والتوزيعات، والتمويل، والتغير في النقد. والتزامات شراء الحفارات تخص كيانات مرتبطة بأرامكو، فلا تُضاف إلى الإنفاق الموحد دون مطابقة، تجنبًا للعد المزدوج.",
        [
          metric("free_cash_flow", "history_annual"),
          claim("aramco-fy2025-dividends-paid"),
          claim("aramco-rig-purchase-commitments"),
        ],
      ),
    ],
  },
  {
    id: "fa-capex",
    title: { ar: "الإنفاق الرأسمالي", en: "Capital expenditure" },
    topics: ["financials", "operations", "forecasts"],
    definition: {
      ar: "الإنفاق الرأسمالي كما يعرضه المُصدر في نتائج القطاعات، والإنفاق النقدي على الأصول الثابتة في قائمة التدفقات. لا يُطابَق آليًا مع «توجيه الاستثمار الرأسمالي»، وهو خطة لها نطاق تعريف مختلف محتمل. الإنفاق النقدي، والإضافات المعترف بها، وغير الملموسة، والاستحواذات، والاستثمارات الخارجية تعريفات مختلفة تُربط قبل أي مقارنة. وإنفاق القطاعات، والإنفاق الموحد، والالتزامات المضمونة لا تُجمع ولا تُبدَّل دون مطابقة.",
      basis: "issuer_non_ifrs",
    },
    inputs: [
      { key: "capex", bucket: "history_annual" },
      { key: "upstream_capex", bucket: "annual", dims: U },
      { key: "downstream_capex", bucket: "annual", dims: D },
      { key: "corporate_capex", bucket: "annual", dims: C },
      { key: "upstream_capex_per_boe", bucket: "annual" },
      { key: "capex_to_depreciation_amortization", bucket: "annual" },
    ],
    b02Inputs: ["capex", "cash_capex"],
    gates: ["capex_definition_scope"],
    questions: [
      "كيف يتوزع الإنفاق بين القطاعين، وهل يتجه نحو الغاز؟",
      "ما الفرق بين الإنفاق الفعلي لعام 2026 والتوجيه، بعد ربط مصدر التوجيه وتعريفه؟",
    ],
    drivers: [
      P(
        "fa-capex-d1",
        "research_interpretation",
        ["financials", "forecasts"],
        "الإنفاق الرأسمالي يجمع إنفاق المحافظة على السعة وإنفاق النمو، ولا تقسيم بينهما في الأدلة. بلا هذا التقسيم، نسبة الإنفاق إلى الإهلاك لا تكفي للحكم على النمو، والنسبة نفسها مشتقة غير معتمدة. ولا يُطابَق الإنفاق الفعلي مع توجيه الاستثمار قبل ربط تعريفيهما.",
        [
          metric("capex_to_depreciation_amortization"),
          claim("aramco-msc-12mbd"),
          claim("aramco-capex-guidance-2026"),
        ],
      ),
    ],
  },
  {
    id: "fa-working-capital-debt",
    title: { ar: "رأس المال العامل والديون", en: "Working capital and debt" },
    topics: ["financials", "risks", "ratios"],
    definition: {
      ar: "تغيرات رأس المال العامل كما في قائمة التدفقات بإشاراتها: الذمم المدينة، والمخزون، والدائنون، والمستحق من الحكومة، والإتاوات المستحقة؛ وليست فروق أرصدة دون مطابقة. الاقتراض المُصدَر والمسدَّد تدفقات، والاقتراض والإيجارات أرصدة. إجمالي المطلوبات ليس دينًا. صافي الدين يحتاج أرصدة الدين أول الفترة وآخرها، والإيجارات، والنقد والنقد المقيد، وتعريف المُصدر. ونطاق EBITDA في نسب الدين يطابق نطاق الدين. النسب في المحرك مشتقات غير معتمدة.",
      basis: "standard_ratio",
    },
    inputs: [
      { key: "working_capital_change", bucket: "annual" },
      { key: "accounts_receivable_change", bucket: "annual" },
      { key: "due_from_government_change", bucket: "annual" },
      { key: "royalties_payable_change", bucket: "annual" },
      { key: "debt_issued", bucket: "annual" },
      { key: "debt_repaid", bucket: "annual" },
      { key: "interest_paid", bucket: "annual" },
      { key: "lease_payments", bucket: "annual" },
      { key: "net_debt_to_ebitda", bucket: "annual" },
      { key: "short_term_borrowings_net", bucket: "annual" },
    ],
    b02Inputs: ["current_borrowings", "noncurrent_borrowings", "cash"],
    gates: ["net_debt", "net_debt_to_ebitda"],
    questions: [
      "هل يتغير المستحق من الحكومة بما يؤثر على التدفق التشغيلي، وما طبيعته؟",
      "ما صافي الدين بتعريف المُصدر، وكيف تغير مع التوزيعات والاستحواذات؟",
    ],
    drivers: [
      P(
        "fa-wc-d1",
        "research_interpretation",
        ["financials", "risks"],
        "وجود بندين خاصين في رأس المال العامل، المستحق من الحكومة والإتاوات المستحقة، يشير إلى أن علاقة الشركة المالية بالدولة قد تمر أيضًا عبر التوقيت النقدي، لا عبر الأرباح فقط. طبيعة البندين وإشاراتهما تحتاج الإيضاح الأصلي، ولا يُقدَّر أثرهما.",
        [metric("due_from_government_change"), metric("royalties_payable_change")],
      ),
    ],
  },
  {
    id: "fa-dividends",
    title: { ar: "توزيعات الأرباح وإعادة الشراء", en: "Dividends and buybacks" },
    topics: ["dividends_actions", "financials"],
    definition: {
      ar: "ثلاثة أشياء منفصلة: سياسة التوزيع، والتوزيع المُعلن، والتوزيع المدفوع (قائمة التدفقات وإيضاح التوزيعات)، بمكونيه الأساسي والمرتبط بالأداء. السياسة ليست التزامًا قبل الإعلان. التوزيعات للمساهمين تُفصل عن التوزيعات لغير المسيطرين. نسبة التغطية مقياس غير IFRS، تحتاج تعريفًا مربوطًا ومطابقة للفترة والإشارات. لا مخرج لربحية السهم في هذا التحليل.",
      basis: "ifrs_line_item",
    },
    inputs: [
      { key: "dividends_paid", bucket: "annual" },
      { key: "base_dividends_paid", bucket: "annual" },
      { key: "performance_linked_dividends_paid", bucket: "annual" },
      { key: "dividends_per_share", bucket: "history_annual" },
      { key: "fcf_dividend_coverage_ratio", bucket: "annual" },
    ],
    b02Inputs: ["dividends_paid"],
    gates: ["fcf_dividend_coverage"],
    questions: [
      "ما حصة التوزيع المرتبط بالأداء من المدفوع، وكيف تغيرت؟",
      "هل غطى التدفق الحر التوزيعات في كل سنة متاحة؟",
      "كيف يتفاعل برنامج إعادة الشراء مع التوزيعات بعد تنفيذه؟ لا تنفيذ مُبلغ عنه بعد.",
    ],
    drivers: [
      P(
        "fa-dividends-d1",
        "reported_record",
        ["dividends_actions"],
        "يحمل سجل المحرك لعام 2025 مكونين للتوزيعات المدفوعة: أساسي ومرتبط بالأداء. أقرّ المجلس توزيعًا أساسيًا للربع الرابع من 2025 (إعلان، لا دفع). وأعلنت الشركة برنامج إعادة شراء مدته 18 شهرًا؛ تنفيذه غير ثابت في الأدلة المتاحة، وهذا لا يعني أنه لم يُنفَّذ شيء منه حتى تاريخ اللقطة.",
        [
          metric("base_dividends_paid"),
          metric("performance_linked_dividends_paid"),
          claim("aramco-q4-2025-base-dividend"),
          claim("aramco-buyback-2026"),
        ],
      ),
      P(
        "fa-dividends-d2",
        "research_interpretation",
        ["dividends_actions", "financials"],
        "المكون الأساسي سياسة توزيع، لا التزام قانوني قبل إعلانه. والمكون المرتبط بالأداء يتغير بصيغة لم تُربط بعد، وقد يتأخر عن فترة الأداء. يلزم الفصل بين السياسة والإعلان والدفع. الفصل بين المكونين يبين أي جزء أكثر تأثرًا بالأسعار، مع بقاء القرار تقديريًا. وإعادة الشراء أداة مرنة تُقرأ مع التدفقات النقدية، لا التزامًا.",
        [
          metric("base_dividends_paid"),
          metric("performance_linked_dividends_paid"),
          claim("aramco-buyback-2026"),
        ],
      ),
    ],
  },
  {
    id: "fa-returns",
    title: { ar: "العائد على رأس المال", en: "Return on capital" },
    topics: ["ratios", "financials"],
    definition: {
      ar: "العائد على متوسط رأس المال المستخدم (ROACE) مقياس غير IFRS من المُصدر، عُدّل تعريفه مع جسر بين القديم والجديد، فلا سلسلة زمنية قابلة للمقارنة ضمنيًا. العائد على حقوق الملكية يحدد بسطه (الربح العائد للمساهمين) ومقامه (حقوق مساهمي الشركة الأم)، والعائد على الأصول يحدد بسطه وأساس متوسطه. والسنة والربع والفترة التراكمية لا تُبدَّل، ولا يُفترض التحويل إلى سنوي. المقاييس في المحرك مشتقات غير معتمدة.",
      basis: "issuer_non_ifrs",
    },
    inputs: [
      { key: "roace", bucket: "annual" },
      { key: "return_on_equity", bucket: "history_annual" },
      { key: "return_on_assets", bucket: "history_annual" },
      { key: "total_equity", bucket: "history_position" },
      { key: "total_assets", bucket: "history_position" },
    ],
    b02Inputs: ["total_equity", "parent_equity", "total_assets", "net_income"],
    questions: [
      "كيف يتغير العائد على رأس المال مع السعر المحقق، ومع تراكم الإنفاق على مشاريع لم تبلغ طاقتها؟",
      "ما أثر الطاقة الفائضة على العائد مقارنة بشركات متكاملة؟ يتعذر بلا نظراء في اللقطة.",
    ],
    drivers: [
      P(
        "fa-returns-d1",
        "research_interpretation",
        ["ratios", "competitors"],
        "العائد على رأس المال يجمع الأسعار والكفاءة وكثافة رأس المال في رقم واحد. الحكم عليه يحتاج مقارنة زمنية بمدخلات مؤهلة، ونظراء بتعريف موحد. لا يتوفر أي منهما الآن.",
        [metric("roace"), { t: "engine_capability", name: "peer_comparison" }],
      ),
    ],
  },
];

export const FINANCIAL: Section = {
  id: "financial-drivers",
  title: { ar: "المحركات المالية", en: "Financial drivers" },
  paragraphs: [
    P(
      "fin-frame",
      "methodology",
      ["financials", "ratios"],
      "كل تحليل أدناه يحدد التعريف المحاسبي، ومدخلاته كهويات في المحرك أو في سجل B02، وأسئلته البحثية، ومحركاته النوعية. لكل مدخل حالة: مدخل محجوب ضمن الـ142، أو حقيقة محرك غير مراجَعة، أو مقياس مشتق غير معتمد، أو غير موجود في اللقطة. لا تحليل كميًا يُنفَّذ: كل التحليلات BLOCKED.",
      [b02("revenue"), metric("free_cash_flow", "history_annual")],
      { metaNumbers: ["142"] },
    ),
    P(
      "fin-coverage",
      "reported_record",
      ["financials"],
      "التغطية الزمنية في اللقطة:\n1. سجل سنوي للسنوات 2021 إلى 2025 لبنود رئيسة: الإيرادات، والربح التشغيلي، وصافي الربح، والتدفق التشغيلي، والإنفاق الرأسمالي، والتوزيع للسهم.\n2. مركز مالي لنهايات السنوات نفسها.\n3. ربعان منفصلان من 2026، وفترة تراكمية منفصلة للنصف الأول من 2026. لا تُبدَّل الفترة التراكمية بالربع.\n\nأغلب بنود القطاعات والتشغيل لسنة 2025 فقط، فتحليل اتجاهها محجوب أصلًا بنقص الفترات.",
      [
        metric("revenue", "history_annual"),
        metric("total_assets", "history_position"),
        metric("revenue", "history_quarter"),
        metric("revenue", "ytd"),
        metric("upstream_revenue", "annual", { segment: "Upstream" }),
      ],
    ),
  ],
  analyses: ANALYSES,
};
