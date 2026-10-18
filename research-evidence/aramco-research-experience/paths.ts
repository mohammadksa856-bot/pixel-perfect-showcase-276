/**
 * WEB-08B05 (B05-R01) — تحويل file URL إلى مسار نظام التشغيل بصورة محمولة.
 * `URL.pathname` ليس مسارًا: على Windows يعطي `/C:/...`، فيفشل Tailwind والقراءة والتجوال.
 * كل مسار نظام في هذا المجلد يمر من هنا عبر `fileURLToPath`.
 */
import { fileURLToPath } from "node:url";

/** مسار نظام التشغيل لـfile URL. `windows` يفرض صيغة Windows أو POSIX (للاختبار)، وإلا فصيغة النظام الحالي. */
export const toNativePath = (url: URL, windows?: boolean): string =>
  fileURLToPath(url, windows === undefined ? undefined : { windows });

/** جذر المستودع كمسار نظام. */
export const REPO_ROOT = toNativePath(new URL("../../", import.meta.url));

/** أجزاء مسار بأي فاصل (`/` أو `\`)، لمطابقة مجلدات مثل routes على كل الأنظمة. */
export const pathSegments = (p: string): string[] => p.split(/[\\/]+/).filter(Boolean);
