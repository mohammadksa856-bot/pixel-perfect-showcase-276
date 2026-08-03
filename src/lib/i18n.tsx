import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "ar" | "en";

/** Every localized string in the content layer uses this shape. CMS-ready. */
export type LocalizedText = { ar: string; en: string };

const STORAGE_KEY = "mi.locale";

type I18nValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  /** Resolve a localized field. */
  t: (text: LocalizedText | undefined) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") setLocaleState(stored);
  }, []);

  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      toggleLocale: () => setLocale(locale === "ar" ? "en" : "ar"),
      t: (text) => (text ? text[locale] : ""),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/** UI copy dictionary — keys resolved through the same locale. */
export const ui = {
  home: { ar: "الرئيسية", en: "Home" },
  sectors: { ar: "القطاعات", en: "Sectors" },
  companies: { ar: "الشركات", en: "Companies" },
  knowledge: { ar: "المعرفة", en: "Knowledge" },
  research: { ar: "الأبحاث", en: "Research" },
  community: { ar: "المجتمع", en: "Community" },
  search: { ar: "بحث", en: "Search" },
  marketsLastUpdated: {
    ar: "آخر تحديث قبل دقيقتين",
    en: "Last updated 2 minutes ago",
  },
  searchPlaceholder: {
    ar: "ابحث عن شركة، قطاع، مقال، أو مفهوم...",
    en: "Search companies, sectors, articles and knowledge...",
  },
  viewAll: { ar: "عرض الكل", en: "View all" },
  heroTitle: { ar: "معرفة استثمار", en: "Maarifat Istithmar" },
  heroSubtitle: { ar: "استثمر بفهم، لا بتوقع.", en: "Invest with understanding, not guesswork." },
  heroDescription: {
    ar: "منصة عربية متخصصة في تحليل الشركات والأسواق والاقتصاد والاستثمار لمساعدة المستثمرين على اتخاذ قرارات مبنية على المعرفة.",
    en: "An Arabic-first platform for company, market and economic analysis — helping investors make knowledge-driven decisions.",
  },
  statCompanies: { ar: "شركة", en: "Companies" },
  statResearch: { ar: "بحث", en: "Research papers" },
  statArticles: { ar: "مقال معرفي", en: "Knowledge articles" },
  statSectors: { ar: "قطاع", en: "Sectors" },
  exploreSectors: { ar: "استكشف القطاعات", en: "Explore sectors" },
  discoverCompanies: { ar: "اكتشف الشركات", en: "Discover companies" },
  latestResearch: { ar: "أحدث الأبحاث", en: "Latest research" },
  knowledgeLibrary: { ar: "مكتبة المعرفة", en: "Knowledge library" },
  communityBoards: { ar: "لوحات النقاش", en: "Discussion boards" },
  readingTime: { ar: "دقيقة قراءة", en: "min read" },
  by: { ar: "بقلم", en: "By" },
  tableOfContents: { ar: "محتويات البحث", en: "Table of contents" },
  relatedResearch: { ar: "أبحاث ذات صلة", en: "Related research" },
  references: { ar: "المراجع", en: "References" },
  relatedCompanies: { ar: "شركات مشابهة", en: "Related companies" },
  difficulty: { ar: "المستوى", en: "Level" },
  recommendedVideos: { ar: "فيديوهات مقترحة", en: "Recommended videos" },
  relatedArticles: { ar: "مقالات ذات صلة", en: "Related articles" },
  newsletter: { ar: "النشرة البريدية", en: "Newsletter" },
  newsletterCopy: {
    ar: "ملخص أسبوعي لأهم الأبحاث والتحليلات.",
    en: "A weekly digest of our best research and analysis.",
  },
  subscribe: { ar: "اشترك", en: "Subscribe" },
  emailPlaceholder: { ar: "بريدك الإلكتروني", en: "Your email" },
  ctaTitle: { ar: "ابدأ رحلتك الاستثمارية الآن", en: "Start your investing journey" },
  ctaCopy: {
    ar: "استكشف الشركات والأبحاث والمقالات في مكان واحد.",
    en: "Explore companies, research and articles in one place.",
  },
  ctaButton: { ar: "استكشف المنصة", en: "Explore the platform" },
  newPost: { ar: "منشور جديد", en: "New post" },
  posts: { ar: "منشور", en: "posts" },
  members: { ar: "عضو", en: "members" },
  like: { ar: "إعجاب", en: "Like" },
  comment: { ar: "تعليق", en: "Comment" },
  bookmark: { ar: "حفظ", en: "Bookmark" },
  price: { ar: "السعر", en: "Price" },
  marketCap: { ar: "القيمة السوقية", en: "Market cap" },
  exchange: { ar: "السوق", en: "Exchange" },
  country: { ar: "الدولة", en: "Country" },
  sector: { ar: "القطاع", en: "Sector" },
  notFound: { ar: "المحتوى غير موجود", en: "Content not found" },
  backHome: { ar: "العودة للرئيسية", en: "Back home" },
  profile: { ar: "الحساب", en: "Profile" },
  theme: { ar: "المظهر", en: "Theme" },
} satisfies Record<string, LocalizedText>;
