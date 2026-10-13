import { createServerFn } from "@tanstack/react-start";
import type { PreviewResult } from "./company-preview.server";

/** الشركات الثلاث الأولى للمعاينة: طاقة، بنك، تأمين. */
export const PREVIEW_COMPANIES = [
  {
    symbol: "2222",
    name: { ar: "أرامكو السعودية", en: "Saudi Aramco" },
    kind: { ar: "طاقة", en: "Energy" },
  },
  {
    symbol: "1120",
    name: { ar: "مصرف الراجحي", en: "Al Rajhi Bank" },
    kind: { ar: "بنوك", en: "Banks" },
  },
  {
    symbol: "8010",
    name: { ar: "التعاونية للتأمين", en: "Tawuniya" },
    kind: { ar: "تأمين", en: "Insurance" },
  },
] as const;

/** هل المعاينة مفعّلة على الخادم؟ لا يكشف أي إعداد آخر. */
export const getPreviewEnabled = createServerFn({ method: "GET" }).handler(async () => {
  const { enginePreviewEnabled } = await import("./company-preview.server");
  return enginePreviewEnabled();
});

/** دالة خادم لصفحة المعاينة. تعيد {state:"disabled"} والعلم معطّل، دون أي اتصال بالمحرك. */
export const getCompanyPreview = createServerFn({ method: "GET" })
  .validator((input: { market: string; symbol: string }) => {
    if (!/^[A-Za-z]{2}$/.test(input.market) || !/^[A-Za-z0-9.]{1,12}$/.test(input.symbol)) {
      throw new Error("invalid company reference");
    }
    return input;
  })
  .handler(async ({ data }): Promise<PreviewResult> => {
    const { fetchCompanyPreview } = await import("./company-preview.server");
    return fetchCompanyPreview(data);
  });
