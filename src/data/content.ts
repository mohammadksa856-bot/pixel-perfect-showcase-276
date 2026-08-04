import researchOil from "@/assets/research-oil.jpg";
import researchSpace from "@/assets/research-space.jpg";
import researchBank from "@/assets/research-bank.jpg";
import type { Board, Company, KnowledgeArticle, Research, Sector } from "./types";

/**
 * Content repository. Every entity mirrors the shape a CMS/database would
 * return, so `src/lib/content.ts` can later swap this module for network reads
 * without touching a single component.
 */

export const sectors: Sector[] = [
  {
    slug: "energy",
    name: { ar: "الطاقة", en: "Energy" },
    tagline: { ar: "النفط والغاز والطاقة المتجددة", en: "Oil, gas and renewables" },
    description: {
      ar: "قطاع يقود الاقتصاد العالمي، ويجمع بين شركات الاستخراج والتكرير والطاقة النظيفة، ويتأثر بدورات الأسعار والسياسات.",
      en: "The backbone of the global economy — upstream, refining and clean energy names driven by price cycles and policy.",
    },
    about: {
      ar: "قطاع الطاقة يشمل الشركات اللي تستخرج أو تنتج أو توزّع مصادر الطاقة، زي النفط والغاز والكهرباء والطاقة الشمسية والرياح. ببساطة، أي شركة تساعد العالم يشغّل بيوته ومصانعه وسياراته تقع تحت هذا القطاع.",
      en: "The energy sector covers companies that extract, produce, or distribute energy sources — oil, gas, electricity, solar, and wind. Simply put, any company that helps power homes, factories, and cars belongs here.",
    },
    icon: "zap",
    tone: "tone-amber",
    companies: 9,
    research: 6,
  },
  {
    slug: "space",
    name: { ar: "الفضاء", en: "Space" },
    tagline: {
      ar: "الإطلاق والأقمار والبنية المدارية",
      en: "Launch, satellites and orbital infrastructure",
    },
    description: {
      ar: "اقتصاد ناشئ سريع النمو يشمل خدمات الإطلاق والأقمار الصناعية والاتصالات المدارية.",
      en: "A fast-growing frontier economy spanning launch services, satellites and orbital connectivity.",
    },
    about: {
      ar: "قطاع الفضاء يضم الشركات اللي تصنع الصواريخ وتطلق الأقمار الصناعية وتبني بنية تحتية تدور حول الأرض، زي أقمار الاتصالات والملاحة. قطاع جديد نسبياً ومرتبط بمستقبل الاستكشاف والاتصالات.",
      en: "The space sector includes companies that build rockets, launch satellites, and create infrastructure orbiting Earth — like communication and navigation satellites. It's a relatively new sector tied to the future of exploration and connectivity.",
    },
    icon: "rocket",
    tone: "tone-violet",
    companies: 6,
    research: 5,
  },
  {
    slug: "defense",
    name: { ar: "الدفاع", en: "Defense" },
    tagline: {
      ar: "الأنظمة الدفاعية والأمن السيادي",
      en: "Defense systems and sovereign security",
    },
    description: {
      ar: "شركات ترتبط بميزانيات حكومية طويلة الأجل وعقود متعددة السنوات مع تدفقات نقدية مستقرة.",
      en: "Companies tied to long-dated government budgets and multi-year contracts with steady cash flows.",
    },
    about: {
      ar: "قطاع الدفاع يشمل الشركات اللي تصنع المعدات والأنظمة العسكرية والأمنية للحكومات، زي الطائرات المقاتلة والصواريخ وأنظمة المراقبة. عادة تعتمد على عقود طويلة الأمد مع الحكومات.",
      en: "The defense sector includes companies that manufacture military and security equipment for governments — like fighter jets, missiles, and surveillance systems. It typically relies on long-term government contracts.",
    },
    icon: "shield",
    tone: "tone-emerald",
    companies: 5,
    research: 3,
  },
  {
    slug: "technology",
    name: { ar: "التقنية", en: "Technology" },
    tagline: { ar: "البرمجيات وأشباه الموصلات والسحابة", en: "Software, semiconductors and cloud" },
    description: {
      ar: "القطاع الأكثر تأثيراً في الأسواق الحديثة، تقوده هوامش عالية ونماذج أعمال قابلة للتوسع.",
      en: "The most influential sector in modern markets, powered by high margins and scalable business models.",
    },
    about: {
      ar: "قطاع التقنية يضم شركات البرمجيات والأجهزة والخدمات السحابية والشركات اللي تبني الأدوات الرقمية اللي نستخدمها يومياً، من الهواتف إلى تطبيقات الأعمال.",
      en: "The technology sector includes software, hardware, and cloud companies — the businesses building the digital tools we use daily, from phones to workplace apps.",
    },
    icon: "laptop",
    tone: "tone-sky",
    companies: 12,
    research: 8,
  },
  {
    slug: "ai",
    name: { ar: "الذكاء الاصطناعي", en: "Artificial Intelligence" },
    tagline: { ar: "الحوسبة والنماذج والتطبيقات", en: "Compute, models and applications" },
    description: {
      ar: "طبقة تقنية عابرة للقطاعات تعيد تشكيل الإنتاجية وسلاسل القيمة من الرقائق حتى التطبيقات.",
      en: "A cross-sector technology layer reshaping productivity and value chains from silicon to applications.",
    },
    about: {
      ar: "قطاع الذكاء الاصطناعي يشمل الشركات اللي تبني نماذج الذكاء الاصطناعي والرقائق اللي تشغّلها والتطبيقات اللي تستخدمه، من المساعدات الذكية إلى أدوات تحليل البيانات.",
      en: "The AI sector includes companies building AI models, the chips that power them, and the applications that use them — from smart assistants to data-analysis tools.",
    },
    icon: "brain",
    tone: "tone-indigo",
    companies: 7,
    research: 7,
  },
  {
    slug: "healthcare",
    name: { ar: "الرعاية الصحية", en: "Healthcare" },
    tagline: { ar: "الأدوية والأجهزة والخدمات", en: "Pharma, devices and services" },
    description: {
      ar: "قطاع دفاعي يجمع بين الابتكار الدوائي والطلب غير الدوري على الخدمات الصحية.",
      en: "A defensive sector combining pharmaceutical innovation with non-cyclical demand for care.",
    },
    about: {
      ar: "قطاع الرعاية الصحية يضم شركات الأدوية والمستلزمات الطبية والمستشفيات والتأمين الصحي — أي شركة تساعد الناس يعيشون حياة أصح وأطول.",
      en: "The healthcare sector includes pharmaceutical companies, medical device makers, hospitals, and health insurers — any business helping people live healthier, longer lives.",
    },
    icon: "heart",
    tone: "tone-rose",
    companies: 8,
    research: 4,
  },
  {
    slug: "financials",
    name: { ar: "الخدمات المالية", en: "Financial Services" },
    tagline: { ar: "البنوك والتأمين والمدفوعات", en: "Banks, insurance and payments" },
    description: {
      ar: "قطاع حساس لأسعار الفائدة ودورة الائتمان، ويضم نماذج ربحية متنوعة من البنوك إلى المدفوعات.",
      en: "Rate- and credit-cycle sensitive, spanning traditional banking through modern payment networks.",
    },
    about: {
      ar: "قطاع الخدمات المالية يشمل البنوك وشركات التأمين ومنصات الدفع والاستثمار — الشركات اللي تدير الأموال وتسهّل حركتها بين الأفراد والشركات.",
      en: "Financial services covers banks, insurers, and payment or investment platforms — the companies that manage money and move it between people and businesses.",
    },
    icon: "landmark",
    tone: "tone-teal",
    companies: 10,
    research: 5,
  },
  {
    slug: "industrials",
    name: { ar: "الصناعة", en: "Industrials" },
    tagline: {
      ar: "التصنيع واللوجستيات والبنية التحتية",
      en: "Manufacturing, logistics and infrastructure",
    },
    description: {
      ar: "قطاع دوري يعكس صحة الاقتصاد الحقيقي عبر الإنتاج الصناعي وسلاسل الإمداد.",
      en: "A cyclical sector reflecting real-economy health through industrial output and supply chains.",
    },
    about: {
      ar: "قطاع الصناعة يضم شركات التصنيع والمعدات الثقيلة والنقل واللوجستيات وبناء البنية التحتية — العمود الفقري اللي يشغّل الاقتصاد الحقيقي.",
      en: "The industrials sector includes manufacturing, heavy equipment, transportation, logistics, and infrastructure companies — the backbone that keeps the real economy running.",
    },
    icon: "factory",
    tone: "tone-orange",
    companies: 9,
    research: 3,
  },
  {
    slug: "consumer",
    name: { ar: "الاستهلاكي", en: "Consumer" },
    tagline: { ar: "التجزئة والعلامات والاستهلاك", en: "Retail, brands and consumption" },
    description: {
      ar: "قطاع يعتمد على قوة العلامة التجارية وسلوك الإنفاق ومرونة الطلب.",
      en: "Driven by brand strength, spending behaviour and demand elasticity.",
    },
    about: {
      ar: "القطاع الاستهلاكي يشمل شركات التجزئة والعلامات التجارية والمنتجات اللي نشتريها يومياً، من الملابس للأطعمة للسلع المنزلية.",
      en: "The consumer sector includes retail companies, brands, and everyday products — from clothing to food to household goods.",
    },
    icon: "shopping",
    tone: "tone-emerald",
    companies: 11,
    research: 4,
  },
  {
    slug: "real-estate",
    name: { ar: "العقار", en: "Real Estate" },
    tagline: { ar: "التطوير والصناديق العقارية", en: "Development and REITs" },
    description: {
      ar: "أصول حقيقية مدرة للدخل تتأثر بتكلفة التمويل ومعدلات الإشغال.",
      en: "Income-producing real assets sensitive to financing costs and occupancy rates.",
    },
    about: {
      ar: "قطاع العقار يضم شركات تطوير وإدارة العقارات السكنية والتجارية، وصناديق الاستثمار العقاري اللي تتيح للمستثمر يملك جزء من عقار بدون ما يشتريه كامل.",
      en: "Real estate includes companies that develop and manage residential and commercial properties, plus REITs — funds that let investors own a share of property without buying it outright.",
    },
    icon: "building",
    tone: "tone-sky",
    companies: 6,
    research: 2,
  },
];

const genericSections = (name: string, nameAr: string) => [
  {
    key: "business-model",
    title: { ar: "نموذج العمل", en: "Business Model" },
    body: {
      ar: `يعتمد نموذج عمل ${nameAr} على تحويل قدراته التشغيلية إلى إيرادات متكررة، مع تركيز واضح على تحسين الهوامش وتوسيع قاعدة العملاء.`,
      en: `${name} converts its operating capability into recurring revenue, with a clear focus on margin expansion and customer base growth.`,
    },
  },
  {
    key: "products",
    title: { ar: "المنتجات والخدمات", en: "Products & Services" },
    body: {
      ar: "محفظة منتجات متنوعة تخدم شرائح عملاء متعددة وتقلل الاعتماد على مصدر دخل واحد.",
      en: "A diversified product portfolio serving multiple customer segments and reducing single-revenue dependency.",
    },
  },
  {
    key: "moat",
    title: { ar: "المزايا التنافسية", en: "Competitive Advantages" },
    body: {
      ar: "حواجز دخول تشمل حجم العمليات، وتكاليف التحول لدى العملاء، والملكية الفكرية، وقوة العلامة.",
      en: "Entry barriers include operating scale, customer switching costs, intellectual property and brand strength.",
    },
  },
  {
    key: "landscape",
    title: { ar: "المشهد التنافسي", en: "Competitive Landscape" },
    body: {
      ar: "منافسة قوية من لاعبين عالميين، ما يجعل الابتكار وكفاءة التكلفة عاملي التمايز الرئيسيين.",
      en: "Strong competition from global players makes innovation and cost efficiency the key differentiators.",
    },
  },
  {
    key: "management",
    title: { ar: "الإدارة", en: "Management" },
    body: {
      ar: "فريق قيادي ذو سجل تنفيذي طويل، وسياسة واضحة لتخصيص رأس المال بين النمو والعوائد.",
      en: "A leadership team with a long execution record and a clear capital allocation policy between growth and returns.",
    },
  },
  {
    key: "risks",
    title: { ar: "المخاطر", en: "Risks" },
    body: {
      ar: "تشمل المخاطر التقلبات الدورية، التغيرات التنظيمية، ضغط المنافسة، والاعتماد على سلاسل الإمداد.",
      en: "Risks include cyclicality, regulatory change, competitive pressure and supply chain dependence.",
    },
  },
  {
    key: "growth",
    title: { ar: "فرص النمو", en: "Growth Opportunities" },
    body: {
      ar: "التوسع الجغرافي، وإطلاق خطوط منتجات جديدة، والاستفادة من موجات التبني التقني.",
      en: "Geographic expansion, new product lines and leverage from technology adoption waves.",
    },
  },
];

const genericFinancials = (base: number) =>
  ["2021", "2022", "2023", "2024"].map((year, i) => ({
    year,
    revenue: `${(base * (1 + i * 0.18)).toFixed(1)}B`,
    netIncome: `${(base * 0.19 * (1 + i * 0.22)).toFixed(1)}B`,
    cashFlow: `${(base * 0.24 * (1 + i * 0.2)).toFixed(1)}B`,
    margin: `${(18 + i * 1.9).toFixed(1)}%`,
    roic: `${(12 + i * 1.4).toFixed(1)}%`,
  }));

const genericValuation = [
  { label: { ar: "مكرر الربحية", en: "P/E" }, value: "28.4x" },
  { label: { ar: "قيمة المنشأة / EBITDA", en: "EV/EBITDA" }, value: "17.1x" },
  { label: { ar: "السعر / المبيعات", en: "P/S" }, value: "6.3x" },
  { label: { ar: "عائد التدفق الحر", en: "FCF yield" }, value: "3.1%" },
];

const genericFaqs = (nameAr: string, name: string) => [
  {
    q: { ar: `ما الذي يحرك أرباح ${nameAr}؟`, en: `What drives ${name}'s earnings?` },
    a: {
      ar: "نمو الإيرادات الأساسي، وكفاءة التكلفة، ودورة الطلب في القطاع.",
      en: "Core revenue growth, cost efficiency and the sector's demand cycle.",
    },
  },
  {
    q: { ar: "هل توزع الشركة أرباحاً؟", en: "Does the company pay dividends?" },
    a: {
      ar: "تعتمد سياسة التوزيع على التدفقات النقدية الحرة وأولويات إعادة الاستثمار.",
      en: "The distribution policy depends on free cash flow and reinvestment priorities.",
    },
  },
  {
    q: { ar: "ما أبرز المخاطر؟", en: "What are the main risks?" },
    a: {
      ar: "المنافسة، التنظيم، وتقلب أسعار المدخلات.",
      en: "Competition, regulation and input price volatility.",
    },
  },
];

const howToBuy = [
  {
    ar: "افتح حساب استثماري لدى وسيط مرخص يتيح التداول في السوق المدرجة.",
    en: "Open an account with a licensed broker that offers access to the listing exchange.",
  },
  {
    ar: "ادرس الشركة وقيّم السعر مقابل القيمة قبل الشراء.",
    en: "Study the company and assess price versus value before buying.",
  },
  {
    ar: "حدد حجم المركز بما يتناسب مع محفظتك ودرجة تحملك للمخاطر.",
    en: "Size the position according to your portfolio and risk tolerance.",
  },
  {
    ar: "نفّذ الأمر ثم تابع النتائج الفصلية والتطورات الجوهرية.",
    en: "Place the order, then track quarterly results and material developments.",
  },
];

type Seed = {
  ticker: string;
  slug: string;
  name: LocalizedName;
  exchange: string;
  sectorSlug: string;
  country: LocalizedName;
  price: string;
  change: string;
  marketCap: string;
  short: LocalizedName;
  base: number;
};
type LocalizedName = { ar: string; en: string };

const companySeeds: Seed[] = [
  {
    ticker: "2222",
    slug: "saudi-aramco",
    name: { ar: "أرامكو السعودية", en: "Saudi Aramco" },
    exchange: "TADAWUL",
    sectorSlug: "energy",
    country: { ar: "السعودية", en: "Saudi Arabia" },
    price: "27.85 SAR",
    change: "+0.9%",
    marketCap: "1.7T$",
    short: {
      ar: "أكبر منتج للنفط في العالم بتكلفة إنتاج من الأدنى عالمياً.",
      en: "The world's largest oil producer with among the lowest production costs.",
    },
    base: 400,
  },
  {
    ticker: "RKLB",
    slug: "rocket-lab",
    name: { ar: "روكيت لاب", en: "Rocket Lab" },
    exchange: "NASDAQ",
    sectorSlug: "space",
    country: { ar: "الولايات المتحدة", en: "United States" },
    price: "$24.10",
    change: "+2.4%",
    marketCap: "11.2B$",
    short: {
      ar: "مزود خدمات إطلاق وأنظمة فضائية متكاملة.",
      en: "End-to-end launch provider and space systems manufacturer.",
    },
    base: 0.4,
  },
  {
    ticker: "RDW",
    slug: "redwire",
    name: { ar: "ريدواير", en: "Redwire" },
    exchange: "NYSE",
    sectorSlug: "space",
    country: { ar: "الولايات المتحدة", en: "United States" },
    price: "$16.40",
    change: "-1.1%",
    marketCap: "1.1B$",
    short: {
      ar: "بنية تحتية فضائية وتصنيع في المدار.",
      en: "Space infrastructure and in-orbit manufacturing.",
    },
    base: 0.3,
  },
  {
    ticker: "ASTS",
    slug: "ast-spacemobile",
    name: { ar: "إيه إس تي سبيس موبايل", en: "AST SpaceMobile" },
    exchange: "NASDAQ",
    sectorSlug: "space",
    country: { ar: "الولايات المتحدة", en: "United States" },
    price: "$31.75",
    change: "+4.2%",
    marketCap: "9.8B$",
    short: {
      ar: "شبكة اتصالات خلوية مباشرة عبر الأقمار الصناعية.",
      en: "Direct-to-cell satellite broadband network.",
    },
    base: 0.1,
  },
  {
    ticker: "AMZN",
    slug: "amazon",
    name: { ar: "أمازون", en: "Amazon" },
    exchange: "NASDAQ",
    sectorSlug: "technology",
    country: { ar: "الولايات المتحدة", en: "United States" },
    price: "$219.30",
    change: "+1.2%",
    marketCap: "2.3T$",
    short: {
      ar: "تجارة إلكترونية وحوسبة سحابية وإعلانات رقمية.",
      en: "E-commerce, cloud computing and digital advertising.",
    },
    base: 574,
  },
  {
    ticker: "MSFT",
    slug: "microsoft",
    name: { ar: "مايكروسوفت", en: "Microsoft" },
    exchange: "NASDAQ",
    sectorSlug: "technology",
    country: { ar: "الولايات المتحدة", en: "United States" },
    price: "$438.60",
    change: "+0.6%",
    marketCap: "3.3T$",
    short: {
      ar: "برمجيات مؤسسية وسحابة Azure ومنتجات إنتاجية.",
      en: "Enterprise software, Azure cloud and productivity suites.",
    },
    base: 245,
  },
  {
    ticker: "NVDA",
    slug: "nvidia",
    name: { ar: "إنفيديا", en: "NVIDIA" },
    exchange: "NASDAQ",
    sectorSlug: "ai",
    country: { ar: "الولايات المتحدة", en: "United States" },
    price: "$126.40",
    change: "+3.1%",
    marketCap: "3.1T$",
    short: {
      ar: "معالجات رسومية ومنصات حوسبة للذكاء الاصطناعي.",
      en: "GPUs and accelerated computing platforms for AI.",
    },
    base: 61,
  },
  {
    ticker: "TSLA",
    slug: "tesla",
    name: { ar: "تسلا", en: "Tesla" },
    exchange: "NASDAQ",
    sectorSlug: "consumer",
    country: { ar: "الولايات المتحدة", en: "United States" },
    price: "$248.90",
    change: "-0.8%",
    marketCap: "790B$",
    short: {
      ar: "سيارات كهربائية وتخزين طاقة وقيادة ذاتية.",
      en: "Electric vehicles, energy storage and autonomy.",
    },
    base: 96,
  },
  {
    ticker: "AAPL",
    slug: "apple",
    name: { ar: "أبل", en: "Apple" },
    exchange: "NASDAQ",
    sectorSlug: "technology",
    country: { ar: "الولايات المتحدة", en: "United States" },
    price: "$229.15",
    change: "+0.4%",
    marketCap: "3.5T$",
    short: {
      ar: "أجهزة متكاملة مع منظومة خدمات عالية الهامش.",
      en: "Integrated hardware with a high-margin services ecosystem.",
    },
    base: 383,
  },
  {
    ticker: "PLTR",
    slug: "palantir",
    name: { ar: "بالانتير", en: "Palantir" },
    exchange: "NASDAQ",
    sectorSlug: "ai",
    country: { ar: "الولايات المتحدة", en: "United States" },
    price: "$41.80",
    change: "+2.0%",
    marketCap: "95B$",
    short: {
      ar: "منصات تحليل بيانات للحكومات والمؤسسات.",
      en: "Data analytics platforms for governments and enterprises.",
    },
    base: 2.2,
  },
];

export const companies: Company[] = companySeeds.map((s) => ({
  ticker: s.ticker,
  slug: s.slug,
  name: s.name,
  exchange: s.exchange,
  sectorSlug: s.sectorSlug,
  country: s.country,
  price: s.price,
  change: s.change,
  marketCap: s.marketCap,
  short: s.short,
  description: {
    ar: `${s.name.ar} شركة رائدة في قطاعها، ${s.short.ar} نغطي هنا نموذج أعمالها، مركزها التنافسي، أداءها المالي، وتقييمها الحالي.`,
    en: `${s.name.en} is a leader in its sector. ${s.short.en} This profile covers its business model, competitive position, financial performance and valuation.`,
  },
  sections: genericSections(s.name.en, s.name.ar),
  financials: genericFinancials(s.base),
  valuation: genericValuation,
  news: [
    {
      title: { ar: "نتائج الربع الأخير تتجاوز التوقعات", en: "Latest quarter beats expectations" },
      source: "Reuters",
      date: "2026-07-28",
    },
    {
      title: { ar: "توسع في أسواق جديدة", en: "Expansion into new markets" },
      source: "Bloomberg",
      date: "2026-07-12",
    },
    {
      title: { ar: "استثمارات رأسمالية جديدة", en: "New capital investment plan" },
      source: "FT",
      date: "2026-06-30",
    },
  ],
  faqs: genericFaqs(s.name.ar, s.name.en),
  howToBuy,
}));

export const research: Research[] = [
  {
    slug: "rate-cut-cycle",
    title: { ar: "هل بدأت دورة خفض الفائدة؟", en: "Has the rate-cut cycle begun?" },
    summary: {
      ar: "تحليل شامل لأحدث بيانات التضخم وتوقعات الفيدرالي وأثرها على تقييم الأصول.",
      en: "A deep look at inflation data, Fed expectations and the impact on asset valuations.",
    },
    author: { ar: "فريق البحث", en: "Research Desk" },
    authorRole: { ar: "قسم الاقتصاد الكلي", en: "Macro research" },
    readingTime: 6,
    date: "2026-05-21",
    image: researchBank,
    sectorSlug: "financials",
    tags: [
      { ar: "الفائدة", en: "Rates" },
      { ar: "الاقتصاد الكلي", en: "Macro" },
    ],
    sections: [
      {
        id: "inflation",
        heading: { ar: "أين يقف التضخم؟", en: "Where inflation stands" },
        body: {
          ar: "تباطأ التضخم الأساسي لأشهر متتالية مع بقاء قطاع الخدمات مصدر الضغط الرئيسي، ما يجعل مسار الفائدة تدريجياً لا حاداً.",
          en: "Core inflation has cooled for several months while services remain the main sticking point, implying a gradual rather than abrupt rate path.",
        },
      },
      {
        id: "policy",
        heading: { ar: "قراءة في موقف الفيدرالي", en: "Reading the Fed" },
        body: {
          ar: "تشير لهجة البيانات الأخيرة إلى تفضيل الانتظار حتى تأكيد اتجاه البيانات، مع استعداد للخفض عند ضعف سوق العمل.",
          en: "Recent communication favours waiting for data confirmation, with readiness to cut if the labour market weakens.",
        },
      },
      {
        id: "portfolio",
        heading: { ar: "الأثر على المحافظ", en: "Portfolio implications" },
        body: {
          ar: "تستفيد الأصول طويلة المدة والشركات ذات النمو المرتفع من انخفاض معدلات الخصم، بينما يتراجع جاذبية النقد.",
          en: "Long-duration assets and high-growth companies benefit from lower discount rates, while cash becomes less attractive.",
        },
      },
    ],
    references: [
      "Federal Reserve — FOMC statements",
      "BLS — Consumer Price Index releases",
      "IMF — World Economic Outlook",
    ],
  },
  {
    slug: "space-economy-2040",
    title: { ar: "اقتصاد الفضاء حتى 2040", en: "The space economy to 2040" },
    summary: {
      ar: "نظرة على حجم السوق المتوقع وسلاسل القيمة والفرص الاستثمارية في قطاع الفضاء.",
      en: "Market size projections, value chains and investment opportunities across the space sector.",
    },
    author: { ar: "فريق البحث", en: "Research Desk" },
    authorRole: { ar: "قطاع الفضاء", en: "Space sector" },
    readingTime: 8,
    date: "2026-05-18",
    image: researchSpace,
    sectorSlug: "space",
    tags: [
      { ar: "الفضاء", en: "Space" },
      { ar: "النمو", en: "Growth" },
    ],
    sections: [
      {
        id: "market",
        heading: { ar: "حجم السوق", en: "Market size" },
        body: {
          ar: "تتوقع التقديرات تجاوز الاقتصاد الفضائي تريليون دولار بحلول 2040، مدفوعاً بالاتصالات ورصد الأرض.",
          en: "Estimates see the space economy exceeding one trillion dollars by 2040, led by connectivity and earth observation.",
        },
      },
      {
        id: "value-chain",
        heading: { ar: "سلسلة القيمة", en: "The value chain" },
        body: {
          ar: "تنقسم القيمة بين الإطلاق، تصنيع الأقمار، الخدمات المدارية، وتحليل البيانات، ولكل طبقة اقتصادياتها.",
          en: "Value splits across launch, satellite manufacturing, in-orbit services and data analytics — each with distinct economics.",
        },
      },
      {
        id: "risk",
        heading: { ar: "المخاطر", en: "Risks" },
        body: {
          ar: "كثافة رأس المال، والاعتماد على العقود الحكومية، وطول دورة التنفيذ أبرز مصادر المخاطر.",
          en: "Capital intensity, government contract dependence and long execution cycles are the main risks.",
        },
      },
    ],
    references: ["Morgan Stanley — Space investment outlook", "NASA — Commercial programs"],
  },
  {
    slug: "oil-still-good",
    title: { ar: "هل مازال النفط استثماراً جيداً؟", en: "Is oil still a good investment?" },
    summary: {
      ar: "تحليل الأساسيات وتوقعات الطلب العالمي على النفط خلال السنوات القادمة.",
      en: "Fundamentals and global demand outlook for oil over the coming years.",
    },
    author: { ar: "فريق البحث", en: "Research Desk" },
    authorRole: { ar: "قطاع الطاقة", en: "Energy sector" },
    readingTime: 5,
    date: "2026-05-15",
    image: researchOil,
    sectorSlug: "energy",
    tags: [
      { ar: "الطاقة", en: "Energy" },
      { ar: "السلع", en: "Commodities" },
    ],
    sections: [
      {
        id: "demand",
        heading: { ar: "الطلب العالمي", en: "Global demand" },
        body: {
          ar: "يستمر نمو الطلب في الأسواق الناشئة بينما يتباطأ في الاقتصادات المتقدمة مع التحول للطاقة النظيفة.",
          en: "Emerging markets keep growing demand while developed economies slow amid the energy transition.",
        },
      },
      {
        id: "supply",
        heading: { ar: "جانب العرض", en: "Supply side" },
        body: {
          ar: "انضباط الإنفاق الرأسمالي لدى المنتجين يدعم الأسعار على المدى المتوسط.",
          en: "Capital discipline among producers supports prices over the medium term.",
        },
      },
      {
        id: "verdict",
        heading: { ar: "الخلاصة", en: "Verdict" },
        body: {
          ar: "يبقى القطاع مصدر دخل جيد للمحافظ المتوازنة، مع حساسية عالية للدورة الاقتصادية.",
          en: "The sector remains a solid income source for balanced portfolios, with high cyclical sensitivity.",
        },
      },
    ],
    references: ["IEA — Oil Market Report", "OPEC — Monthly reports"],
  },
];

export const knowledge: KnowledgeArticle[] = [
  {
    slug: "investing",
    title: { ar: "الاستثمار", en: "Investing" },
    summary: {
      ar: "أساسيات بناء المحفظة والتفكير طويل الأجل.",
      en: "Portfolio building and long-term thinking fundamentals.",
    },
    category: { ar: "أساسيات", en: "Foundations" },
    icon: "chart",
    level: { ar: "مبتدئ", en: "Beginner" },
    readingTime: 7,
    sections: [
      {
        heading: { ar: "ما هو الاستثمار؟", en: "What is investing?" },
        body: {
          ar: "الاستثمار هو تخصيص رأس المال اليوم بهدف الحصول على تدفقات مستقبلية أعلى من قيمته الحالية.",
          en: "Investing is allocating capital today to obtain future cash flows worth more than that capital.",
        },
      },
      {
        heading: { ar: "الأفق الزمني", en: "Time horizon" },
        body: {
          ar: "كلما طال الأفق الزمني، انخفض أثر التقلبات قصيرة الأجل على النتيجة النهائية.",
          en: "The longer the horizon, the smaller the effect of short-term volatility on the final outcome.",
        },
      },
    ],
    videos: [{ title: { ar: "مقدمة في الاستثمار", en: "Intro to investing" }, duration: "12:40" }],
  },
  {
    slug: "economics",
    title: { ar: "الاقتصاد", en: "Economics" },
    summary: {
      ar: "كيف تؤثر السياسات والدورات على الأسواق.",
      en: "How policy and cycles shape markets.",
    },
    category: { ar: "اقتصاد", en: "Economics" },
    icon: "globe",
    level: { ar: "متوسط", en: "Intermediate" },
    readingTime: 9,
    sections: [
      {
        heading: { ar: "الدورة الاقتصادية", en: "The business cycle" },
        body: {
          ar: "تمر الاقتصادات بمراحل توسع وذروة وانكماش وتعافٍ، ولكل مرحلة قطاعات مفضلة.",
          en: "Economies cycle through expansion, peak, contraction and recovery — each phase favours different sectors.",
        },
      },
    ],
    videos: [
      {
        title: { ar: "شرح الدورة الاقتصادية", en: "The business cycle explained" },
        duration: "15:02",
      },
    ],
  },
  {
    slug: "financial-statements",
    title: { ar: "القوائم المالية", en: "Financial Statements" },
    summary: {
      ar: "قراءة الميزانية وقائمة الدخل والتدفقات النقدية.",
      en: "Reading the balance sheet, income statement and cash flows.",
    },
    category: { ar: "تحليل", en: "Analysis" },
    icon: "file",
    level: { ar: "متوسط", en: "Intermediate" },
    readingTime: 11,
    sections: [
      {
        heading: { ar: "القوائم الثلاث", en: "The three statements" },
        body: {
          ar: "قائمة الدخل تقيس الأداء، والميزانية تقيس المركز المالي، والتدفقات النقدية تكشف جودة الأرباح.",
          en: "The income statement measures performance, the balance sheet position, and cash flows reveal earnings quality.",
        },
      },
    ],
    videos: [
      { title: { ar: "تحليل قائمة الدخل", en: "Income statement walkthrough" }, duration: "18:20" },
    ],
  },
  {
    slug: "valuation",
    title: { ar: "التقييم", en: "Valuation" },
    summary: { ar: "طرق تقدير القيمة العادلة للشركات.", en: "Methods for estimating fair value." },
    category: { ar: "تحليل", en: "Analysis" },
    icon: "calculator",
    level: { ar: "متقدم", en: "Advanced" },
    readingTime: 13,
    sections: [
      {
        heading: { ar: "التدفقات النقدية المخصومة", en: "Discounted cash flow" },
        body: {
          ar: "قيمة الشركة هي القيمة الحالية لتدفقاتها النقدية المستقبلية مخصومة بمعدل يعكس المخاطر.",
          en: "A company's value is the present value of its future cash flows discounted at a risk-adjusted rate.",
        },
      },
    ],
    videos: [{ title: { ar: "بناء نموذج DCF", en: "Building a DCF model" }, duration: "24:11" }],
  },
  {
    slug: "accounting",
    title: { ar: "المحاسبة", en: "Accounting" },
    summary: {
      ar: "لغة الأعمال ومبادئ الاعتراف بالإيراد.",
      en: "The language of business and revenue recognition.",
    },
    category: { ar: "أساسيات", en: "Foundations" },
    icon: "book",
    level: { ar: "مبتدئ", en: "Beginner" },
    readingTime: 8,
    sections: [
      {
        heading: { ar: "مبدأ الاستحقاق", en: "Accrual principle" },
        body: {
          ar: "تُسجل الإيرادات والمصروفات عند حدوثها لا عند حركة النقد.",
          en: "Revenue and expenses are recorded when incurred, not when cash moves.",
        },
      },
    ],
    videos: [{ title: { ar: "أساسيات المحاسبة", en: "Accounting basics" }, duration: "10:05" }],
  },
  {
    slug: "financial-ratios",
    title: { ar: "المؤشرات المالية", en: "Financial Ratios" },
    summary: {
      ar: "أدوات مقارنة سريعة لقياس الأداء والملاءة.",
      en: "Quick comparison tools for performance and solvency.",
    },
    category: { ar: "تحليل", en: "Analysis" },
    icon: "pie",
    level: { ar: "متوسط", en: "Intermediate" },
    readingTime: 6,
    sections: [
      {
        heading: { ar: "نسب الربحية", en: "Profitability ratios" },
        body: {
          ar: "هامش الربح والعائد على رأس المال المستثمر من أهم مقاييس جودة الأعمال.",
          en: "Margins and return on invested capital are the key measures of business quality.",
        },
      },
    ],
    videos: [
      { title: { ar: "أهم عشر نسب مالية", en: "Top ten financial ratios" }, duration: "14:33" },
    ],
  },
  {
    slug: "macroeconomics",
    title: { ar: "الاقتصاد الكلي", en: "Macroeconomics" },
    summary: {
      ar: "الفائدة والتضخم والنمو وأثرها على الأصول.",
      en: "Rates, inflation, growth and their effect on assets.",
    },
    category: { ar: "اقتصاد", en: "Economics" },
    icon: "trending",
    level: { ar: "متقدم", en: "Advanced" },
    readingTime: 12,
    sections: [
      {
        heading: { ar: "أدوات السياسة النقدية", en: "Monetary policy tools" },
        body: {
          ar: "تستخدم البنوك المركزية سعر الفائدة والميزانية العمومية لإدارة التضخم والنمو.",
          en: "Central banks use policy rates and their balance sheet to manage inflation and growth.",
        },
      },
    ],
    videos: [
      {
        title: { ar: "كيف تعمل البنوك المركزية", en: "How central banks work" },
        duration: "20:48",
      },
    ],
  },
  {
    slug: "technical-analysis",
    title: { ar: "التحليل الفني", en: "Technical Analysis" },
    summary: {
      ar: "قراءة السعر والحجم وسلوك السوق.",
      en: "Reading price, volume and market behaviour.",
    },
    category: { ar: "تحليل", en: "Analysis" },
    icon: "activity",
    level: { ar: "مبتدئ", en: "Beginner" },
    readingTime: 7,
    sections: [
      {
        heading: { ar: "الاتجاه والدعم والمقاومة", en: "Trend, support and resistance" },
        body: {
          ar: "يساعد تحديد الاتجاه ومستويات السعر المهمة في إدارة التوقيت وليس في تقدير القيمة.",
          en: "Identifying trend and key levels helps with timing, not with estimating value.",
        },
      },
    ],
    videos: [{ title: { ar: "أساسيات الرسوم البيانية", en: "Chart basics" }, duration: "11:12" }],
  },
  {
    slug: "fundamental-analysis",
    title: { ar: "التحليل الأساسي", en: "Fundamental Analysis" },
    summary: {
      ar: "تقييم جودة الأعمال من الداخل.",
      en: "Assessing business quality from the inside out.",
    },
    category: { ar: "تحليل", en: "Analysis" },
    icon: "search",
    level: { ar: "متوسط", en: "Intermediate" },
    readingTime: 10,
    sections: [
      {
        heading: { ar: "من الأعلى للأسفل ومن الأسفل للأعلى", en: "Top-down and bottom-up" },
        body: {
          ar: "يبدأ الأول من الاقتصاد والقطاع، بينما يبدأ الثاني من الشركة نفسها.",
          en: "The first starts from the economy and sector, the second from the company itself.",
        },
      },
    ],
    videos: [{ title: { ar: "كيف تحلل شركة", en: "How to analyse a company" }, duration: "22:30" }],
  },
  {
    slug: "risk-management",
    title: { ar: "إدارة المخاطر", en: "Risk Management" },
    summary: {
      ar: "حجم المركز والتنويع وحماية رأس المال.",
      en: "Position sizing, diversification and capital preservation.",
    },
    category: { ar: "أساسيات", en: "Foundations" },
    icon: "shield",
    level: { ar: "متوسط", en: "Intermediate" },
    readingTime: 8,
    sections: [
      {
        heading: { ar: "التنويع الفعّال", en: "Effective diversification" },
        body: {
          ar: "التنويع الحقيقي يقوم على اختلاف مصادر المخاطر لا على كثرة الأسماء.",
          en: "Real diversification comes from different risk drivers, not from owning many names.",
        },
      },
    ],
    videos: [
      { title: { ar: "إدارة مخاطر المحفظة", en: "Portfolio risk management" }, duration: "16:44" },
    ],
  },
];

export const boards: Board[] = sectors.slice(0, 8).map((s, i) => ({
  slug: s.slug,
  name: s.name,
  description: s.tagline,
  posts: 40 + i * 17,
  members: 320 + i * 145,
  tone: s.tone,
  latest: [
    {
      title: {
        ar: `نقاش: ما أفضل شركة في ${s.name.ar} لعام 2026؟`,
        en: `Discussion: best ${s.name.en} pick for 2026?`,
      },
      author: { ar: "عبدالله", en: "Abdullah" },
      likes: 24 + i,
      comments: 8 + i,
      time: { ar: "قبل ساعتين", en: "2h ago" },
    },
    {
      title: {
        ar: `تحليل: تأثير الفائدة على ${s.name.ar}`,
        en: `Analysis: rate impact on ${s.name.en}`,
      },
      author: { ar: "سارة", en: "Sarah" },
      likes: 15 + i,
      comments: 5 + i,
      time: { ar: "أمس", en: "Yesterday" },
    },
  ],
}));
