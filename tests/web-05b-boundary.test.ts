// WEB-05B final fixes (Codex FIX REQUIRED at 407d7e8): Preview navigation boundary, static checks.
// The runtime counterpart (every rendered link, network requests, 390px width) is
// product-tracking/tools/web_05b_boundary_audit.mjs and web_05b_e2e.mjs.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { PreviewFooter, NOT_IN_PREVIEW } from "../src/components/web-v1/preview-footer";
import { I18nProvider } from "../src/lib/i18n";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const PREVIEW_FILES = [
  ...readdirSync(new URL("../src/components/web-v1/", import.meta.url)).map(
    (f) => `src/components/web-v1/${f}`,
  ),
  ...readdirSync(new URL("../src/routes/", import.meta.url))
    .filter((f) => f.startsWith("preview.web-v1"))
    .map((f) => `src/routes/${f}`),
];

describe("every Preview link stays under /preview/web-v1", () => {
  test("no Link/to or href to a non-Preview internal route in Preview components and routes", () => {
    for (const f of PREVIEW_FILES) {
      const src = read(f);
      const bad = [...src.matchAll(/\b(?:to|href)=["'{`]+(\/[^"'`}]*)/g)]
        .map((m) => m[1]!)
        .filter((h) => !h.startsWith("/preview/web-v1"));
      expect(bad, f).toEqual([]);
      expect(src, f).not.toMatch(/\bto: "\/(?!preview\/web-v1)[a-z]/);
    }
  });

  test("Codex boundary acceptance: company breadcrumb targets the Preview Saudi market", () => {
    const src = read("src/components/web-v1/company-template.tsx");
    expect(src).not.toContain('to="/markets/saudi"');
    expect(src).toContain('to="/preview/web-v1/markets/saudi"');
  });

  test("the shell uses the isolated Preview footer; the production footer is untouched and unused here", () => {
    const shell = read("src/components/web-v1/shell.tsx");
    expect(shell).not.toContain("site-footer");
    expect(shell).toContain("<PreviewFooter />");
    expect(shell).not.toMatch(/to="\/watchlist"/);
    // WEB-06 D10: لا مدخل لمتابعتي (مؤجلة)، ولا زر معطّل يبدو قابلًا للتشغيل.
    expect(shell).not.toContain('data-unavailable="watchlist"');
  });
});

describe("Preview footer", () => {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  const html = renderToStaticMarkup(
    createElement(
      RouterContextProvider,
      { router },
      createElement(I18nProvider, null, createElement(PreviewFooter)),
    ),
  );

  test("all links are Preview routes", () => {
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!);
    expect(hrefs.length).toBe(5);
    for (const h of hrefs) expect(h).toMatch(/^\/preview\/web-v1\//);
  });

  test("pages not built in the Preview are listed as plain text, never as links", () => {
    expect(NOT_IN_PREVIEW.map((x) => x.key)).toEqual(["about", "contact", "privacy", "terms"]);
    for (const x of NOT_IN_PREVIEW) expect(html).toContain(`data-not-in-preview-item="${x.key}"`);
    const block = /<p[^>]*data-not-in-preview[\s\S]*?<\/p>/.exec(html)![0];
    expect(block).not.toMatch(/<a |<button/);
  });

  // WEB-06 D10 (قرار معتمد بتغيير السلوك، لا تخفيف): الوظائف المؤجلة لا مدخل لها في التذييل،
  // ولا نموذج كتابة (بما فيه نموذج النشرة المعطّل) في المعاينة.
  test("deferred features have no entry; no form of any kind; no Supabase in the footer module", () => {
    for (const k of ["watchlist", "community", "accounts"])
      expect(html).not.toContain(`data-not-in-preview-item="${k}"`);
    expect(html).not.toMatch(/<form|<input|data-preview-form/);
    const src = read("src/components/web-v1/preview-footer.tsx");
    expect(src).not.toMatch(/supabase|\.insert\(|fetch\(/);
  });
});
