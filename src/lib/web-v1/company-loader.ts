import { notFound } from "@tanstack/react-router";
import { getCompanyPreview } from "@/lib/engine/company-preview.functions";
import { getPeerTable } from "@/lib/engine/peer-comparison.functions";
import { getWebV1Enabled } from "./flag.functions";

/**
 * WEB-07: تحميل صفحة الشركة لمستويي «نظرة عامة» و«تحليل الشركة». نفس شروط WEB-06 تمامًا:
 * المعاينة والمحرك مفعّلان على الخادم وإلا 404، ولا بيانات بديلة عند الخطأ.
 */
export async function loadCompany(symbol: string, withPeers: boolean) {
  if (!(await getWebV1Enabled())) throw notFound();
  const ref = { market: "SA", symbol };
  const [result, peers] = await Promise.all([
    getCompanyPreview({ data: ref }),
    withPeers ? getPeerTable({ data: ref }).catch(() => null) : Promise.resolve(null),
  ]);
  if (result.state === "disabled" || result.state === "not_found") throw notFound();
  return { result, peers };
}
