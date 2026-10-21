import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const root = ".output/public";
const files: string[] = [];
function visit(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (/\.(js|html)$/.test(path)) files.push(path);
  }
}
visit(root);
if (files.length < 10) throw new Error("Build output missing");
const forbidden = [
  "6,420.15",
  "21,320.44",
  "45,210.88",
  "$118,530",
  "آخر تحديث قبل دقيقتين",
  "Last updated 2 minutes ago",
  "hello@marifa-istithmar.example",
  "This summary currently updates weekly",
];
const findings = files.flatMap((file) => {
  const text = readFileSync(file, "utf8");
  return forbidden.filter((value) => text.includes(value)).map((value) => ({ file, value }));
});
console.log(
  JSON.stringify(
    {
      scannedFiles: files.length,
      forbiddenMarkers: forbidden.length,
      findings,
      pass: findings.length === 0,
    },
    null,
    2,
  ),
);
if (findings.length) process.exitCode = 1;
