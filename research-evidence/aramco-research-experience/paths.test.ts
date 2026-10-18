// WEB-08B05 B05-R01: portable file URL -> native path conversion. These run on POSIX here, and force the
// Windows conversion through fileURLToPath({ windows: true }) so the Windows form is exercised too.
import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { DEFAULT_BUILD_DIR } from "./public-leak-scan";
import { REPO_ROOT, pathSegments, toNativePath } from "./paths";

describe("file URL to native path", () => {
  test("Windows file URLs become drive paths, never /C:/…", () => {
    const p = toNativePath(new URL("file:///C:/Users/dev/pixel/src/"), true);
    expect(p).toBe("C:\\Users\\dev\\pixel\\src\\");
    expect(p.startsWith("/")).toBe(false);
    // the B05-R01 defect: URL.pathname is not a path
    expect(new URL("file:///C:/Users/dev/pixel/src/").pathname).toBe("/C:/Users/dev/pixel/src/");
  });
  test("POSIX file URLs stay POSIX paths", () => {
    expect(toNativePath(new URL("file:///home/dev/pixel/src/"), false)).toBe(
      "/home/dev/pixel/src/",
    );
  });
  test("encoded characters are decoded, as a filesystem expects", () => {
    expect(toNativePath(new URL("file:///C:/My%20Repo/src/"), true)).toBe("C:\\My Repo\\src\\");
    expect(toNativePath(new URL("file:///home/My%20Repo/"), false)).toBe("/home/My Repo/");
  });
  test("the repository root resolves to real files on this system", () => {
    expect(existsSync(join(REPO_ROOT, "package.json"))).toBe(true);
    expect(readFileSync(join(REPO_ROOT, "src", "styles.css"), "utf8")).toContain(
      '@source "../src";',
    );
    expect(readdirSync(join(REPO_ROOT, "src", "routes")).length).toBeGreaterThan(30);
  });
  test("the default build directory is a native path under the repository", () => {
    expect(DEFAULT_BUILD_DIR).toBe(join(REPO_ROOT, ".vercel", "output"));
    expect(DEFAULT_BUILD_DIR.split(sep).slice(-2)).toEqual([".vercel", "output"]);
  });
  test("path segments split on either separator", () => {
    expect(pathSegments("C:\\r\\src\\routes\\a.tsx")).toEqual([
      "C:",
      "r",
      "src",
      "routes",
      "a.tsx",
    ]);
    expect(pathSegments("/r/src/routes/a.tsx")).toEqual(["r", "src", "routes", "a.tsx"]);
  });
});

test("no B05 source builds a filesystem path from URL.pathname", () => {
  const dir = join(REPO_ROOT, "research-evidence", "aramco-research-experience");
  const files = readdirSync(dir).filter(
    (f) => /\.(ts|tsx)$/.test(f) && f !== "paths.ts" && f !== "paths.test.ts",
  );
  expect(files.length).toBeGreaterThanOrEqual(8);
  for (const f of files) {
    const code = readFileSync(join(dir, f), "utf8");
    // `u.pathname` in server.ts is the HTTP request path, not a filesystem path
    const hits = [...code.matchAll(/(\w+)\)?\.pathname\b/g)].filter((m) => m[1] !== "u");
    expect({ f, hits: hits.map((m) => m[0]) }).toEqual({ f, hits: [] });
  }
});
