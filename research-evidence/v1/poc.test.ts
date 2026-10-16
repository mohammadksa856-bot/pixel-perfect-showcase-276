import { test, expect } from "bun:test";
import { escapeHTML, renderPoc } from "./poc";
test("synthetic reader journey exposes exact reference then original, never numbers in claim", async () => {
  const intel = await renderPoc("/intelligence");
  expect(intel.body).toContain('href="/evidence"');
  expect(intel.body).not.toContain('"value": 123');
  const evidence = await renderPoc("/evidence");
  const href = evidence.body.match(/href="(\/marefa-data[^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  expect(href).toBeDefined();
  const original = await renderPoc(href!);
  expect(original.status).toBe(200);
  expect(original.body).toContain("&quot;value&quot;: 123");
});
test("withheld or wrong original version has no fallback or original numeric payload", async () => {
  const intel = await renderPoc("/intelligence?state=withheld");
  expect(intel.body).not.toContain('href="/evidence"');
  const evidence = await renderPoc("/evidence?state=withheld");
  expect(evidence.body).not.toContain('href="/marefa-data');
  const wrong = await renderPoc("/marefa-data?id=synthetic-revenue&version=999");
  expect(wrong.status).toBe(404);
  expect(wrong.body).not.toContain("123");
});
test("untrusted HTML is escaped and PoC stays explicit synthetic", async () => {
  expect(escapeHTML('<img src=x onerror="alert(1)">')).toBe(
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
  );
  const result = await renderPoc("/intelligence");
  expect(result.body).toContain("SYNTHETIC LOCAL TEST ONLY");
  expect(result.body).not.toContain("<script");
});
