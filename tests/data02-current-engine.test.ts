// Run against actual current Codex local API responses, not b70254e fixtures.
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCompanyPreview, contractProblems, type EnginePage } from '../src/lib/engine/company-preview';
const root=process.env.DATA02_CURRENT_ENGINE_RESPONSES;
if (!root) throw new Error('Explicit local current engine artifact root required');
const symbols=['2222','1120','7010','2082','2280','4190','4004','4300'];
for (const symbol of symbols) test(`DATA02 current-engine ${symbol}: safe product mapping, no readiness certification`,()=>{
  const page:EnginePage=JSON.parse(readFileSync(join(root,`${symbol}-corrected-api.json`),'utf8'));
  expect(contractProblems(page)).toEqual([]);
  const preview=buildCompanyPreview(page);
  expect(preview.readiness.score).toBeNull();
  expect(preview.readiness.target).toBeNull();
  expect(preview.topics).toHaveLength(18);
  for (const topic of preview.topics) expect(topic.score).toBeNull();
  const facts=preview.topics.flatMap(t=>t.blocks.flatMap(b=>b.type==='facts'?b.facts:[]));
  if (['1120','2082','2280','4190','4004'].includes(symbol))
    expect(facts.some(f=>f.key==='legal_name')).toBe(true);
  if (symbol==='4004') expect(facts.some(f=>f.key==='chairman'||f.key==='chairman_name')).toBe(false);
  if (symbol==='7010') {
    const policy=page.sections.profile.dividend_policy.value as Record<string,unknown>;
    expect(policy.minimum_quarterly_dividend_per_share).toBe('0.55');
    expect(policy.actual_paid_dividend_per_share).toBeNull();
    expect('quarterly_dividend_per_share' in policy).toBe(false);
  }
  if (process.env.DATA02_EXPECT_FINANCIAL_HOLDS==='true' && ['2082','4004','4190'].includes(symbol)) {
    const financial=page.sections.financials;
    const keys=symbol==='2082'?['other_reserves','share_capital','other_expense']:['finance_costs'];
    for (const key of keys) {
      const rows=financial.annual.metrics[key] ?? financial.instant.metrics[key];
      expect(rows).toBeDefined();
      for (const row of rows ?? []) {
        expect(row.value).toBeNull();
        expect(row.quality_status).toBe('quarantined');
        expect(row.quality_reasons).toContain('source_not_accepted_for_display');
      }
    }
    const displayed=preview.topics.flatMap(t=>t.blocks.flatMap(b=>b.type==='metrics'?b.group.cells:[]));
    expect(displayed.some(c=>keys.includes(c.key))).toBe(false);
  }
});
