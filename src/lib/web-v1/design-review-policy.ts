export const DESIGN_REVIEW_BRANCH = "codex/vercel-claude-build-review-20261014";
type Env = Record<string, string | undefined>;

/** Frozen fixtures are never a fallback for a failed live API or a production deployment. */
export function designReviewFixturesEnabled(env: Env = process.env): boolean {
  return (
    env["MAREFA_DESIGN_FIXTURES"] === "true" &&
    env["VERCEL_ENV"] === "preview" &&
    env["VERCEL_GIT_COMMIT_REF"] === DESIGN_REVIEW_BRANCH &&
    env["WEB_V1_PREVIEW_ENABLED"] === "true" &&
    env["ENGINE_PREVIEW_ENABLED"] === "true"
  );
}
