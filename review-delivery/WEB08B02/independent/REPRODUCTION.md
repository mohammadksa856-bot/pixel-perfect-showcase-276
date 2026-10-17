# Independent review reproduction

The independent session tested implementation b1f90a9f4e21ef9f1277c07376c3c7f4d2ad2bcf in its own clone. Its original reports and log paths refer to that review workspace. All original files remain unchanged there.

For this portable delivery, only the import path in independent-b02.test.ts was adapted to the repository layout, and Prettier formatting applied. No assertion, synthetic data or test logic changed. Structural TypeScript AST equality was verified against the original after the same import-path adaptation, excluding formatting parentheses, punctuation and the SourceFile full-text property. Initial comparison helpers included those formatting/raw-text differences and failed; they were not used as assertion outcomes. The final semantic node comparison passed. Original review test SHA256: 774ad718314571985a6d0dd39b9456acdcbdf342b286fae2b8716870bf18c673.

Run from repository root with existing compatible Bun/dependencies:

```text
bun test ./review-delivery/WEB08B02/independent/independent-b02.test.ts
python review-delivery/WEB08B02/independent/verify-evidence.py --repo . --private-root <authorized-directory> --output <new-integrity-file.json>
python review-delivery/WEB08B02/independent/check-classifications.py --repo . --private-root <authorized-directory> --output <new-classification-file.json>
```

The 24 synthetic tests need no source PDFs. The Python checks require the privately held originals and working papers, not bundled here. They report metadata/booleans and do not import facts or change production. Pixel comparison is an archived unsuccessful exploratory check, not an acceptance gate. Source-page visual inspection is a separate result.

Archived text uses normalized line endings; original preservation checksums apply to the original workspace. This transport is not a separate financial certification or live integration.
