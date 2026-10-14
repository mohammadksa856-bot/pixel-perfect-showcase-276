export const DESIGN_REVIEW_BRANCH = "codex/vercel-claude-build-review-20261014";
/** Review branches allowed to bundle the frozen fixtures (exact names, no patterns). */
export const DESIGN_REVIEW_BRANCHES: readonly string[] = [
  DESIGN_REVIEW_BRANCH,
  "claude/web-03-04-company-page",
  // WEB-05A: added so this batch's Preview can render; the only change to a WEB-03/04 file (noted in BR-018).
  "claude/web-05a-site-pages",
  // WEB-03 acceptance fixes branch (exact name), so its Preview renders the frozen samples.
  "claude/web-03-acceptance-fixes",
  // WEB-05A search-copy fix branch (exact name), so its Preview renders the frozen samples.
  "claude/web-05a-search-copy-fix",
  // WEB-03 source-conflict fix branch (exact name), so its Preview renders the frozen samples.
  "claude/web-03-source-conflict-fix",
  // WEB-05B markets & sectors branch (exact name), so its Preview renders the frozen samples.
  "claude/web-05b-markets-sectors",
];
type Env = Record<string, string | undefined>;

/** Frozen fixtures are never a fallback for a failed live API or a production deployment. */
export function designReviewFixturesEnabled(env: Env = process.env): boolean {
  return (
    env["MAREFA_DESIGN_FIXTURES"] === "true" &&
    env["VERCEL_ENV"] === "preview" &&
    DESIGN_REVIEW_BRANCHES.includes(env["VERCEL_GIT_COMMIT_REF"] ?? "") &&
    env["WEB_V1_PREVIEW_ENABLED"] === "true" &&
    env["ENGINE_PREVIEW_ENABLED"] === "true"
  );
}
