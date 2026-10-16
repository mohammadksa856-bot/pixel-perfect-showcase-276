# Locator proof dependency closure

Independent re-review of 4570432 found that a source-only fact receipt used to prove an additional page was not pinned by review approval. The resolver now deterministically selects that exact receipt (canonical reference order), includes it in the review basis, and checks its verification time against financial approval. The same selection is used by source eligibility, so proof and review cannot diverge. Registered document locators remain pinned by their document record. Unrelated context facts do not invalidate approvals.

`independent-locator.test.ts` preserves all twelve reviewer assertions and synthetic fixtures, adapting import paths only and applying formatting. All three previously failing security assertions must pass, alongside the nine controls. Original independent reports remain historical evidence and are not overwritten.

Scope remains synthetic, server-trusted metadata only; no production integration, document publication, engine changes, financial calculations or user acceptance.
