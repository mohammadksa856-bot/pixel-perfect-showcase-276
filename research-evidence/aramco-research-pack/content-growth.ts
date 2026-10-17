/**
 * WEB-08B04 — المشاريع والنمو. الحالة والسعة والتوقيت والتكلفة تُقرأ من سجل مشاريع B03 المقبول هندسيًا
 * (حالات لا قيم)، والتفسير منفصل عن السجل. لا تكلفة ولا أثر ربحي ولا تاريخ تشغيل مختلق.
 */
import { P, b02, claim, metric } from "./content-business";
import type { Section } from "./schema";

const project = (id: string) => ({ t: "b03_project" as const, id });
const milestones = claim("aramco-project-milestones-2025");

export const GROWTH: Section = {
  id: "projects-growth",
  title: { ar: "المشاريع والنمو", en: "Projects and growth" },
  paragraphs: [
    P(
      "pg-frame",
      "research_interpretation",
      ["operations", "forecasts", "business"],
      "تتجه المشاريع الظاهرة في السجل نحو هدفين: نمو الغاز (جافورة وهدف سعة الغاز للبيع)، والمحافظة على سعة الخام (السعة القصوى المستدامة، وزيادة مرجان وفق تفسير غير مثبت لغرضها). غرض تناجيب غير مذكور في الأدلة، فلا يُصنَّف. كل مشروع يُقرأ بثلاث حالات منفصلة: ما يسجله المحرك، وما وجده المراجع في الأصل دون استخراج، وما لا يذكره أي منهما.",
      [milestones, claim("aramco-sales-gas-growth-2030"), claim("aramco-msc-12mbd")],
    ),
    P(
      "pg-milestones-composite",
      "gap",
      ["operations"],
      "سجل مراحل المشاريع واحد يلخص ثلاث مراحل مختلفة خلال فترة تقرير 2025، دون تاريخ دقيق لكل منها. هو مجموعة سجل مركبة، لا ثلاثة أحداث مثبتة كلٌّ بتاريخه.",
      [milestones, { t: "b03_event", id: "evt-projects-2025" }],
    ),
    P(
      "pg-capex-guidance",
      "management_plan",
      ["forecasts", "financials"],
      "أعلنت الشركة نطاقًا لتوجيه الاستثمار الرأسمالي لعام 2026 (سجل المحرك). التوجيه خطة لا إنفاق فعلي، ولا يُقارن آليًا بالإنفاق الرأسمالي المحاسبي. الادعاء محجوب. وجد المراجع المستقل موضعًا رسميًا بديلًا في بيان نتائج 2025 المنشور في 2026-03-10، لكنه لم يُربط بالادعاء. تاريخ معرفة السجل (2026-03-09) لا يُعدَّل.",
      [
        claim("aramco-capex-guidance-2026"),
        { t: "external_review", id: "CAPITAL_INVESTMENT_GUIDANCE" },
      ],
    ),
    P(
      "pg-capex-segments",
      "reported_record",
      ["financials", "operations"],
      "يحمل سجل المحرك الإنفاق الرأسمالي لعام 2025 موزعًا على التنقيب والإنتاج والتكرير والقطاع المؤسسي، والإنفاق الرأسمالي الموحد للسنوات 2021 إلى 2025. الإنفاق الموحد من المدخلات المحجوبة.",
      [
        metric("upstream_capex", "annual", { segment: "Upstream" }),
        metric("downstream_capex", "annual", { segment: "Downstream" }),
        metric("corporate_capex", "annual", { segment: "Corporate" }),
        metric("capex", "history_annual"),
        b02("capex"),
      ],
    ),
    P(
      "pg-rigs",
      "reported_record",
      ["risks", "operations"],
      "لدى الكيانات المرتبطة بأرامكو، كما في نهاية 2025، التزامات مضمونة متبقية لشراء حفارات بحرية وبرية. المراجع المستقل نبّه إلى أن عدد الحفارات البرية في نص المحرك مشتق (المطلوب ناقص المسلّم)، لا عدد مطبوع. المبالغ لا تُعاد هنا.",
      [claim("aramco-rig-purchase-commitments")],
    ),
    P(
      "pg-rigs-reading",
      "research_interpretation",
      ["operations", "forecasts", "risks"],
      "التزامات شراء الحفارات المضمونة تخص كيانات مرتبطة بأرامكو. الأدلة لا تحدد من المشتري ومن الضامن، ولا متى تُسلَّم الحفارات ومتى يُعترف بالدفع. قد تشير إلى نشاط حفر لاحق، لكنها ليست بالضرورة إنفاقًا رأسماليًا مباشرًا للمجموعة أو مدفوعات نقدية منها. لذلك لا تُضاف إلى الإنفاق الرأسمالي أو التدفق الحر قبل فصل الأدوار والتوقيت، تجنبًا للعد المزدوج.",
      [
        claim("aramco-rig-purchase-commitments"),
        metric("upstream_capex", "annual", { segment: "Upstream" }),
      ],
    ),
    P(
      "pg-project-cost-gap",
      "gap",
      ["financials", "operations"],
      "لا تكلفة مشروع منفردة في سجلات المحرك لأي من المشاريع الخمسة، والأصل لم يُفحص للتكلفة. لذلك لا عائد مشروع ولا أثر ربحي لأي مشروع في هذه الحزمة.",
      [project("jafurah"), project("marjan-increment"), project("sales-gas-growth-2030")],
    ),
  ],
  projects: [
    {
      b03ProjectId: "jafurah",
      nature: P(
        "pj-jafurah-nature",
        "reported_record",
        ["operations", "business"],
        "جافورة مشروع غاز بدأ الإنتاج خلال فترة تقرير 2025. معمل غازها ومعمل تجزئة سوائل الغاز في رياس تستخدمهما الشركة حصريًا بعقد تعرفة مدته 20 سنة.",
        [milestones, claim("aramco-jafurah-midstream-contract"), project("jafurah")],
      ),
      purpose: P(
        "pj-jafurah-purpose",
        "research_interpretation",
        ["operations", "forecasts"],
        "الغرض المادي: معالجة غاز جافورة وتجزئة سوائله لتغذية تيار «الغاز الطبيعي وسوائله». يُفصل هذا عن الجانب المالي والمحاسبي: بحسب ملاحظة المراجع على الإيضاح الأصلي، تبقى ملكية الأصول وسيطرتها التشغيلية لدى المجموعة، والمتحصلات المقدمة حقوق لغير المسيطرين عند التوحيد. فلا يدل عقد التعرفة على خروج الأصول من الحسابات الموحدة.",
        [
          claim("aramco-jafurah-midstream-contract"),
          metric("revenue_by_product", "annual", { product: "Natural gas and NGLs" }),
          { t: "external_review", id: "B04_JAFURAH_NOTE34" },
        ],
      ),
      risks: [
        P(
          "pj-jafurah-risk-volume",
          "research_interpretation",
          ["risks", "operations"],
          "التزامات الحد الأدنى للحجم قد تُنشئ حدًا أدنى للمدفوعات حتى لو قلّ الإنتاج عن المتوقع. مدى ذلك يتوقف على تاريخ البدء، وبنود الإعفاء، والطرف المقابل، والمعالجة في القوائم الموحدة، ولا يثبت أي منها في الأدلة المتاحة. لا يُستنتج أن كل تأخر يصبح كلفة ثابتة.",
          [
            claim("aramco-jafurah-midstream-contract"),
            { t: "external_review", id: "B04_JAFURAH_NOTE34" },
          ],
        ),
      ],
      gaps: [
        P(
          "pj-jafurah-gaps",
          "gap",
          ["operations"],
          "السعة والتوقيت موجودان في الأصل وفق المراجع، ولم يُستخرجا. التكلفة ليست في سجل المحرك. طبيعة المكمن ليست في الأدلة. تاريخ بدء مدة العقد غير مذكور.",
          [project("jafurah")],
        ),
      ],
    },
    {
      b03ProjectId: "tanajib",
      nature: P(
        "pj-tanajib-nature",
        "reported_record",
        ["operations"],
        "تناجيب بدأ التشغيل خلال فترة تقرير 2025، بحسب سجل مراحل المشاريع.",
        [milestones, project("tanajib")],
      ),
      purpose: P(
        "pj-tanajib-purpose",
        "gap",
        ["operations", "business"],
        "الغرض الاقتصادي لتناجيب ومنتجاته ليسا في الأدلة المتاحة. المؤشر المرتبط في المحرك هو إنتاج الغاز، وهو ربط تنسيقي لا دليل على طبيعة المشروع.",
        [project("tanajib"), metric("total_gas_production")],
      ),
      risks: [
        P(
          "pj-tanajib-risk",
          "research_interpretation",
          ["risks", "operations"],
          "خطر المشروع في مرحلة التشغيل الأولى هو بلوغ الطاقة التصميمية في الوقت المخطط. لا دليل هنا على الطاقة ولا على الجدول، فلا يُقاس الخطر.",
          [project("tanajib")],
        ),
      ],
      gaps: [
        P(
          "pj-tanajib-gaps",
          "gap",
          ["operations"],
          "السعة والتوقيت موجودان في الأصل وفق المراجع، ولم يُستخرجا. التكلفة ليست في سجل المحرك.",
          [project("tanajib")],
        ),
      ],
    },
    {
      b03ProjectId: "marjan-increment",
      nature: P(
        "pj-marjan-nature",
        "reported_record",
        ["operations"],
        "زيادة مرجان دخلت الخدمة خلال فترة تقرير 2025، بحسب سجل مراحل المشاريع. المؤشرات المرتبطة في المحرك هي إنتاج السوائل والغاز.",
        [milestones, project("marjan-increment")],
      ),
      purpose: P(
        "pj-marjan-purpose",
        "research_interpretation",
        ["operations", "forecasts"],
        "قد تشير التسمية «زيادة» إلى توسعة حقل قائم، لكن الاسم وحده لا يثبت المنتجات ولا الغرض. أحد الاحتمالات دعم السعة القصوى المستدامة للخام. التفسير غير معتمد: الأدلة لا تحدد منتجات الزيادة ولا حصصها.",
        [project("marjan-increment"), claim("aramco-msc-12mbd")],
      ),
      risks: [
        P(
          "pj-marjan-risk",
          "research_interpretation",
          ["risks", "operations"],
          "قد تبقى سعة إضافية غير مستخدمة فترة من الزمن إن لم تسمح قرارات الإنتاج بذلك. وفي المقابل قد تعوض تراجع حقول أخرى، أو تدعم موثوقية الإمداد والمنتجات المصاحبة. الأثر على الإيرادات غير محدد.",
          [project("marjan-increment"), claim("aramco-hydrocarbon-risk-factors")],
        ),
      ],
      gaps: [
        P(
          "pj-marjan-gaps",
          "gap",
          ["operations"],
          "السعة والتوقيت موجودان في الأصل وفق المراجع، ولم يُستخرجا. التكلفة ليست في سجل المحرك. موقع الحقل وطبيعته ليسا في الأدلة.",
          [project("marjan-increment")],
        ),
      ],
    },
    {
      b03ProjectId: "sales-gas-growth-2030",
      nature: P(
        "pj-gas-nature",
        "management_plan",
        ["forecasts", "operations"],
        "تستهدف الإدارة نمو سعة إنتاج الغاز للبيع بحلول 2030 مقارنة بمستوى 2021. مقدار الهدف في نص المحرك يخالف الأصل: الأصل يستخدم صيغة تقريب، والمحرك «أكثر من». لذلك لا يُقتبس المقدار. الهدف مشروط في الأصل بالطلب وبمشاريع لم يُتخذ قرار استثمارها النهائي.",
        [
          claim("aramco-sales-gas-growth-2030"),
          { t: "external_review", id: "GAS_TARGET" },
          project("sales-gas-growth-2030"),
        ],
      ),
      purpose: P(
        "pj-gas-purpose",
        "research_interpretation",
        ["forecasts", "financials"],
        "الغرض المعلن نمو سعة إنتاج الغاز للبيع. أثره المالي مشروط: قد يزيد وزن تيار الغاز وسوائله في الإيرادات إذا كانت الكميات الإضافية مبيعات خارجية، وبحسب الأسعار المحققة لمزيج الغاز وسوائله. لا يثبت في الأدلة أن البرنامج سيرفع هذا الوزن أو يزيد اعتماد الشركة على سعر الغاز. وسعر الغاز المحقق غير متاح في السجل.",
        [claim("aramco-sales-gas-growth-2030"), metric("natural_gas_revenue")],
      ),
      risks: [
        P(
          "pj-gas-risk",
          "research_interpretation",
          ["risks", "forecasts"],
          "مخاطر الهدف ثلاثة:\n1. شرط الطلب.\n2. قرارات الاستثمار النهائية للمشاريع غير المعتمدة بعد.\n3. عائد الاستثمار، ويتوقف على الأسعار والكميات والتكلفة والجدول، لا على سعر الغاز وحده.\n\nلا يُحكم على تحقق الهدف قبل معرفة صيغته الأصلية وشروطه ومراحله المؤرخة.",
          [claim("aramco-sales-gas-growth-2030"), { t: "external_review", id: "GAS_TARGET" }],
        ),
      ],
      gaps: [
        P(
          "pj-gas-gaps",
          "gap",
          ["forecasts"],
          "الصيغة الأصلية للهدف وشروطه تحتاج ربط مستند موثوق ومراجعة مخولة. السعة والتوقيت في الأصل وفق المراجع، ولم يُستخرجا. التكلفة ليست في سجل المحرك.",
          [project("sales-gas-growth-2030")],
        ),
      ],
    },
    {
      b03ProjectId: "msc-12mbd",
      nature: P(
        "pj-msc-nature",
        "management_plan",
        ["operations", "forecasts"],
        "الحفاظ على سعة إنتاج قصوى مستدامة من النفط الخام عند 12 مليون برميل يوميًا. هدف إدارة لسعة، لا إنتاج فعلي، ولا تاريخ له في الجملة. عنوان سجل المحرك يذكر 2030، لكنه لا يُنسب إلى هذه الجملة بالاستنتاج.",
        [claim("aramco-msc-12mbd"), project("msc-12mbd")],
      ),
      purpose: P(
        "pj-msc-purpose",
        "research_interpretation",
        ["operations", "risks"],
        "الحفاظ على السعة يتطلب عادةً في صناعة النفط إنفاقًا مستمرًا لتعويض التراجع الطبيعي للحقول وإبقاء طاقة فائضة. للطاقة الفائضة قيمة خيار وموثوقية في الإمداد، وهي أداة لقرارات الإنتاج، وفي الوقت نفسه كلفة على رأس المال. معدل التراجع لأرامكو ليس في الأدلة.",
        [claim("aramco-msc-12mbd"), metric("upstream_capex", "annual", { segment: "Upstream" })],
      ),
      risks: [
        P(
          "pj-msc-risk",
          "research_interpretation",
          ["risks"],
          "إن بقي إنتاج الخام دون السعة طويلًا، قد يصبح الإنفاق على السعة الفائضة عبئًا على العائد على رأس المال. لكن للسعة قيمة خيار وموثوقية، وتعوض التراجع الطبيعي، وأثرها يتوقف على توزيع التكلفة والأفق الزمني. لا حكم هنا، والقياس محجوب.",
          [claim("aramco-msc-12mbd"), metric("roace")],
        ),
      ],
      gaps: [
        P(
          "pj-msc-gaps",
          "gap",
          ["operations", "financials"],
          "تقسيم الإنفاق الرأسمالي بين إنفاق المحافظة وإنفاق النمو ليس في الأدلة. توقيت الهدف غير مذكور في سجل المحرك.",
          [project("msc-12mbd"), metric("upstream_capex", "annual", { segment: "Upstream" })],
        ),
      ],
    },
  ],
};
