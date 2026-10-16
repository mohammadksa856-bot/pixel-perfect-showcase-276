// Usage: node product-tracking/tools/token_compare.mjs <original.ts> <formatted.ts>  (WEB-07 final: proves Prettier-only changes)
// Compare two TS files by token stream (TypeScript scanner): ignores whitespace/comments; normalises
// string-literal quote style, optional semicolons/trailing commas and single-arrow-parameter parens
// (the only things Prettier changes here).
import ts from "typescript";
import { readFileSync } from "node:fs";
const toks = (f) => {
  const sc = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    readFileSync(f, "utf8"),
  );
  const out = [];
  for (let k = sc.scan(); k !== ts.SyntaxKind.EndOfFileToken; k = sc.scan()) {
    if (k === ts.SyntaxKind.StringLiteral) out.push("STR:" + sc.getTokenValue());
    else if (k === ts.SyntaxKind.SemicolonToken) continue;
    else out.push(sc.getTokenText());
  }
  // drop trailing commas before closing brackets; collapse "( x ) =>" to "x =>" (Prettier arrowParens)
  const noComma = out.filter((t, i) => !(t === "," && [")", "]", "}"].includes(out[i + 1])));
  const res = [];
  for (let i = 0; i < noComma.length; i++) {
    if (
      noComma[i] === "(" &&
      /^[A-Za-z_$][\w$]*$/.test(noComma[i + 1]) &&
      noComma[i + 2] === ")" &&
      noComma[i + 3] === "=>"
    ) {
      res.push(noComma[i + 1]);
      i += 2;
    } else res.push(noComma[i]);
  }
  return res;
};
const [a, b] = process.argv.slice(2).map(toks);
const same = a.length === b.length && a.every((t, i) => t === b[i]);
console.log(same ? "TOKENS IDENTICAL" : "DIFFERENT", a.length, b.length);
if (!same) {
  const i = a.findIndex((t, j) => t !== b[j]);
  console.log(a.slice(i - 5, i + 5), b.slice(i - 5, i + 5));
}
process.exit(same ? 0 : 1);
