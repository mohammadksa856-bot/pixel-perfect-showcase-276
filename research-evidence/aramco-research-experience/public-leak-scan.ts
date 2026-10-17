/**
 * WEB-08B05 — فحص تسرب المسودة المحجوبة إلى مخرجات بناء التطبيق العام.
 * يقرأ كل ملف نصي في مجلد البناء (افتراضيًا .vercel/output) ويبحث عن:
 *   - مقطع مميز من كل فقرة من الفقرات الـ99 (عربي، ومن الإنجليزي حين يوجد)،
 *   - معرفات الحزمة والتجربة ووسم المسودة.
 * أي إصابة، أو غياب مجلد البناء، يعني فشلًا (exit 1).
 *   bun run build && bun research-evidence/aramco-research-experience/public-leak-scan.ts
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { compilePack } from "../aramco-research-pack/pack";

export function leakNeedles(): string[] {
  const pack = compilePack();
  const frag = (s: string) => {
    const clean = s.replace(/\s+/g, " ").trim();
    return clean.slice(
      Math.max(0, Math.floor(clean.length / 2) - 20),
      Math.floor(clean.length / 2) + 20,
    );
  };
  return [
    ...pack.paragraphs.flatMap((p) => [frag(p.ar), ...(p.en ? [frag(p.en)] : [])]),
    "aramco-research-experience",
    "aramco-research-pack",
    "UNAPPROVED_RESEARCH_DRAFT",
    "marefa-aramco-research-pack",
  ];
}

export function scan(dir: string) {
  if (!existsSync(dir)) throw Error(`build_output_missing:${dir}`);
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(m?js|cjs|html|css|json|map|txt|ts)$/.test(f)) files.push(p);
    }
  };
  walk(dir);
  const needles = leakNeedles();
  const hits: { file: string; needle: string }[] = [];
  for (const f of files) {
    const t = readFileSync(f, "utf8");
    for (const n of needles) if (t.includes(n)) hits.push({ file: f, needle: n });
  }
  return { dir, files: files.length, needles: needles.length, hits };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir =
    process.argv[2] ?? join(new URL("../../", import.meta.url).pathname, ".vercel/output");
  const r = scan(dir);
  console.log(
    JSON.stringify({ dir: r.dir, files: r.files, needles: r.needles, hits: r.hits.length }),
  );
  for (const h of r.hits.slice(0, 20)) console.log("HIT", h.file, JSON.stringify(h.needle));
  process.exit(r.hits.length || r.files === 0 ? 1 : 0);
}
