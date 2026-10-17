/**
 * WEB-08B05 — أنماط تجربة البحث: نظام تصميم الموقع نفسه (src/styles.css برموزه وطبقاته) مُجمَّعًا
 * بـTailwind v4 على أصناف هذا المجلد فقط، مع خطوط الموقع (Cairo وIBM Plex Sans Arabic، رخصة OFL)
 * مستضافة محليًا، فلا يطلب القارئ أي مورد خارجي.
 */
import { readdirSync, readFileSync } from "node:fs";
import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const ROOT = new URL("../../", import.meta.url);
const HERE = new URL("./", import.meta.url);
export const FONT_DIR = new URL("./fonts/", import.meta.url);

const ARABIC =
  "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC";
const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

/** ملفات الخطوط المسموح بتقديمها (أسماء ثابتة من المجلد، لا مسارات من الطلب). */
export const FONT_FILES: readonly string[] = readdirSync(FONT_DIR).filter((f) =>
  /^[a-z0-9-]+\.woff2$/.test(f),
);

function fontFaces(): string {
  const out: string[] = [];
  for (const [family, file] of [
    ["Cairo", "cairo"],
    ["IBM Plex Sans Arabic", "ibm-plex-sans-arabic"],
  ] as const)
    for (const w of [400, 600, 700])
      for (const [subset, range] of [
        ["arabic", ARABIC],
        ["latin", LATIN],
      ] as const) {
        const name = `${file}-${subset}-${w}-normal.woff2`;
        if (!FONT_FILES.includes(name)) throw Error(`missing_font:${name}`);
        out.push(
          `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(/assets/fonts/${name}) format("woff2");unicode-range:${range}}`,
        );
      }
  return out.join("\n");
}

let css: string | null = null;

/** يجمّع أنماط الموقع لأصناف هذا المجلد. مصدر الرموز: src/styles.css دون تعديل. */
export async function buildCss(): Promise<string> {
  if (css) return css;
  const styles = readFileSync(new URL("src/styles.css", ROOT), "utf8");
  if (!styles.includes('@source "../src";')) throw Error("styles_source_changed");
  const input =
    styles.replace(
      '@source "../src";',
      '@source "../research-evidence/aramco-research-experience";',
    ) +
    "\n" +
    readFileSync(new URL("components.css", HERE), "utf8");
  const compiler = await compile(input, {
    base: new URL("src/", ROOT).pathname,
    onDependency: () => {},
  });
  const scanner = new Scanner({ sources: compiler.sources.map((s) => ({ ...s })) });
  const built = compiler.build(scanner.scan());
  css = `${fontFaces()}\n${built}`;
  return css;
}

export const fontPath = (name: string) => new URL(name, FONT_DIR);
export const HERE_PATH = HERE.pathname;
