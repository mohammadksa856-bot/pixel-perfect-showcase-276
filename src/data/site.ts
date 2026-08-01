import researchOil from "@/assets/research-oil.jpg";
import researchSpace from "@/assets/research-space.jpg";
import researchBank from "@/assets/research-bank.jpg";

export const navLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "القطاعات", href: "/sectors" },
  { label: "المعرفة", href: "/knowledge" },
  { label: "الأبحاث", href: "/research" },
  { label: "المجتمع", href: "/community" },
] as const;

export const stats = [
  { value: "32", label: "بحث", icon: "file", tone: "text-tone-emerald" },
  { value: "120", label: "مقال", icon: "book", tone: "text-tone-sky" },
  { value: "45", label: "شركة", icon: "building", tone: "text-tone-violet" },
  { value: "8", label: "قطاعات", icon: "pie", tone: "text-tone-orange" },
] as const;

export const sectors = [
  { label: "الطاقة", icon: "zap", tone: "tone-amber" },
  { label: "الفضاء", icon: "rocket", tone: "tone-violet" },
  { label: "الدفاع", icon: "shield", tone: "tone-emerald" },
  { label: "التقنية", icon: "laptop", tone: "tone-sky" },
  { label: "الذكاء الاصطناعي", icon: "brain", tone: "tone-indigo" },
  { label: "الخدمات المالية", icon: "landmark", tone: "tone-teal" },
  { label: "الصناعة", icon: "factory", tone: "tone-orange" },
  { label: "الرعاية الصحية", icon: "heart", tone: "tone-rose" },
] as const;

export const companies = [
  { name: "Rocket Lab", ticker: "RKLB", sector: "الفضاء" },
  { name: "Redwire", ticker: "RDW", sector: "الفضاء" },
  { name: "AST SpaceMobile", ticker: "ASTS", sector: "الاتصالات" },
  { name: "NVIDIA", ticker: "NVDA", sector: "التقنية" },
  { name: "Amazon", ticker: "AMZN", sector: "التقنية" },
  { name: "Saudi Aramco", ticker: "2222", sector: "الطاقة" },
  { name: "Tesla", ticker: "TSLA", sector: "السيارات" },
  { name: "Microsoft", ticker: "MSFT", sector: "التقنية" },
] as const;

export const research = [
  {
    title: "هل بدأت دورة خفض الفائدة؟",
    excerpt: "تحليل شامل لأحدث بيانات التضخم وتوقعات الفيدرالي للمستقبل القريب.",
    date: "21 مايو 2024",
    readTime: "6 دقائق قراءة",
    image: researchBank,
    ratio: "portrait" as const,
  },
  {
    title: "اقتصاد الفضاء حتى 2040",
    excerpt: "نظرة على حجم السوق المتوقع والفرص الكبيرة في قطاع الفضاء.",
    date: "18 مايو 2024",
    readTime: "8 دقائق قراءة",
    image: researchSpace,
    ratio: "landscape" as const,
  },
  {
    title: "هل مازال النفط استثماراً جيداً؟",
    excerpt: "تحليل الأساسيات وتوقعات الطلب العالمي على النفط خلال السنوات القادمة.",
    date: "15 مايو 2024",
    readTime: "5 دقائق قراءة",
    image: researchOil,
    ratio: "landscape" as const,
  },
];

export const topics = [
  { label: "الاستثمار", icon: "chart" },
  { label: "الاقتصاد", icon: "globe" },
  { label: "التحليل الأساسي", icon: "search" },
  { label: "التحليل الفني", icon: "activity" },
  { label: "المحاسبة", icon: "calculator" },
  { label: "القوائم المالية", icon: "file" },
  { label: "المؤشرات الاقتصادية", icon: "trending" },
  { label: "المؤشرات المالية", icon: "pie" },
] as const;

export const footerColumns = [
  {
    title: "روابط سريعة",
    links: ["الرئيسية", "القطاعات", "المعرفة", "الأبحاث", "المجتمع"],
  },
  {
    title: "عن المنصة",
    links: ["من نحن", "الرؤية والرسالة", "فريق العمل", "تواصل معنا"],
  },
  {
    title: "المساعدة",
    links: ["الأسئلة الشائعة", "دليل الاستخدام", "سياسة الخصوصية", "الشروط والأحكام"],
  },
] as const;
