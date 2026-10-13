import { createServerFn } from "@tanstack/react-start";

/**
 * معاينة تصميم MAREFA-WEB-V1. معطّلة افتراضيًا: لا تُفعَّل إلا بالقيمة "true" حرفيًا على الخادم،
 * وبدونها تعيد كل صفحات /preview/web-v1 الخطأ 404. لا تغيّر أي صفحة منشورة.
 */
export function webV1PreviewEnabled(env: Record<string, string | undefined> = process.env) {
  return env["WEB_V1_PREVIEW_ENABLED"] === "true";
}

export const getWebV1Enabled = createServerFn({ method: "GET" }).handler(async () =>
  webV1PreviewEnabled(),
);
