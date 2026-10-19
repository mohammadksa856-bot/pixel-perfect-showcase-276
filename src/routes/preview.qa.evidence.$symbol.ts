import { createFileRoute } from "@tanstack/react-router";

/**
 * W0 (QA خاص): أدلة المراجع منفصلة عن صفحات Overview وInvestor وData. 404 خارج معاينة QA المجمّدة،
 * و401/403 قبل قراءة ملف الأدلة لأي طلب غير مصادق أو غير مفوّض (qa-evidence.server.ts).
 */
export const Route = createFileRoute("/preview/qa/evidence/$symbol")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { qaEvidenceHttp } = await import("@/lib/engine/qa-evidence.server");
        return qaEvidenceHttp(request, params.symbol);
      },
    },
  },
});
