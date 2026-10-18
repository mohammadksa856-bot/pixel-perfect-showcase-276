# ملحق: الحقول الناقصة لكل فئة (sa:2222، العقد 1.0.0)

مولَّد آليًا من `FIELD-REQUIREMENTS.json` بالأداة `tools/field_list.py`. الفئات بترتيب العقد. 
`*` = ضمن أصغر مجموعة تكفي للوصول إلى 95 في السيناريو S5. الفئة D لا تُملأ أبدًا: مسارها استبعاد مراجَع بعد الموافقة.

## company_profile — الوزن 8، الحد 85%، موجود 32/58

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `business_model` * | company_model | A (مصدر الشركة) | A3 |
| `cik` | company_model | D (استبعاد مراجَع) | A7 |
| `investor_contact_email` * | company_model | A (مصدر الشركة) | A3 |
| `lei` * | company_model | A (مصدر الشركة) | A3 |
| `sharia_status` * | company_model | C (ترخيص/تغذية) | A6 |
| `audit_committee` * | governance_profile | A (مصدر الشركة) | A3 |
| `board_committees` * | governance_profile | A (مصدر الشركة) | A3 |
| `board_meetings_held` * | governance_profile | A (مصدر الشركة) | A3 |
| `board_of_directors` * | governance_profile | A (مصدر الشركة) | A3 |
| `board_size` * | governance_profile | A (مصدر الشركة) | A3 |
| `board_term_end` * | governance_profile | A (مصدر الشركة) | A3 |
| `compensation_committee` * | governance_profile | A (مصدر الشركة) | A3 |
| `compensation_policy` * | governance_profile | A (مصدر الشركة) | A3 |
| `corporate_secretary` * | governance_profile | A (مصدر الشركة) | A3 |
| `executive_management_team` * | governance_profile | A (مصدر الشركة) | A3 |
| `governance_framework` | governance_profile | A (مصدر الشركة) | A3 |
| `independent_directors` * | governance_profile | A (مصدر الشركة) | A3 |
| `internal_control_assessment` | governance_profile | A (مصدر الشركة) | A3 |
| `nomination_committee` * | governance_profile | A (مصدر الشركة) | A3 |
| `sustainability_risk_hse_committee` * | governance_profile | A (مصدر الشركة) | A3 |
| `competitive_environment` | industry_context | A (مصدر الشركة) | A3 |
| `industry_drivers` | industry_context | A (مصدر الشركة) | A3 |
| `industry_growth` | industry_context | A (مصدر الشركة) | A3 |
| `industry_overview` | industry_context | A (مصدر الشركة) | A3 |
| `industry_size` | industry_context | A (مصدر الشركة) | A3 |
| `regulatory_environment` | industry_context | A (مصدر الشركة) | A3 |

## financial_statements — الوزن 14، الحد 95%، موجود 200/254

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `accumulated_other_comprehensive_income` * | balance_sheet | A (مصدر الشركة) | A1 |
| `cash_equivalents` * | balance_sheet | A (مصدر الشركة) | A1 |
| `cash_restricted` * | balance_sheet | A (مصدر الشركة) | A1 |
| `current_portion_long_term_debt` * | balance_sheet | A (مصدر الشركة) | A1 |
| `current_tax_assets` * | balance_sheet | A (مصدر الشركة) | A1 |
| `employee_benefits_current` * | balance_sheet | A (مصدر الشركة) | A1 |
| `investments_joint_ventures` * | balance_sheet | A (مصدر الشركة) | A1 |
| `long_term_securities` * | balance_sheet | A (مصدر الشركة) | A1 |
| `marketable_securities` * | balance_sheet | A (مصدر الشركة) | A1 |
| `other_receivables` * | balance_sheet | A (مصدر الشركة) | A1 |
| `prepayments` * | balance_sheet | A (مصدر الشركة) | A1 |
| `zakat_payable` * | balance_sheet | A (مصدر الشركة) | A1 |
| `capital_increase_proceeds` * | cash_flow | A (مصدر الشركة) | A1 |
| `discretionary_cash_flow` * | cash_flow | B (حساب داخلي) | A5 |
| `foreign_exchange_effect` * | cash_flow | A (مصدر الشركة) | A1 |
| `intangible_asset_purchases` * | cash_flow | A (مصدر الشركة) | A1 |
| `joint_venture_investments` * | cash_flow | A (مصدر الشركة) | A1 |
| `loans_to_affiliates` * | cash_flow | A (مصدر الشركة) | A1 |
| `net_income_cash_flow` * | cash_flow | A (مصدر الشركة) | A1 |
| `operating_profit_before_working_capital_changes` | cash_flow | B (حساب داخلي) | A5 |
| `other_financing_cash_flow` * | cash_flow | A (مصدر الشركة) | A1 |
| `owner_earnings` * | cash_flow | B (حساب داخلي) | A5 |
| `ppe_purchases` * | cash_flow | A (مصدر الشركة) | A1 |
| `proceeds_investments` * | cash_flow | A (مصدر الشركة) | A1 |
| `purchases_investments` * | cash_flow | A (مصدر الشركة) | A1 |
| `securities_purchases` * | cash_flow | A (مصدر الشركة) | A1 |
| `securities_sales` * | cash_flow | A (مصدر الشركة) | A1 |
| `short_term_investments_net` * | cash_flow | A (مصدر الشركة) | A1 |
| `zakat_paid` * | cash_flow | A (مصدر الشركة) | A1 |
| `benefit_obligation_by_geography` | financial_notes | A (مصدر الشركة) | A1 |
| `borrowings_by_currency` | financial_notes | A (مصدر الشركة) | A1 |
| `contingencies` | financial_notes | A (مصدر الشركة) | A1 |
| `contract_assets` | financial_notes | A (مصدر الشركة) | A1 |
| `contract_liabilities` | financial_notes | A (مصدر الشركة) | A1 |
| `customer_concentration` | financial_notes | A (مصدر الشركة) | A1 |
| `remaining_performance_obligations` | financial_notes | A (مصدر الشركة) | A1 |
| `revenue_by_customer_type` | financial_notes | A (مصدر الشركة) | A1 |
| `unsecured_borrowings` | financial_notes | A (مصدر الشركة) | A1 |
| `variable_lease_expense` | financial_notes | A (مصدر الشركة) | A1 |
| `weighted_average_borrowing_rate` | financial_notes | A (مصدر الشركة) | A1 |
| `adjusted_ebit` * | income_statement | A (مصدر الشركة) | A1 |
| `adjusted_ebitda` * | income_statement | A (مصدر الشركة) | A1 |
| `continuing_operations_income` * | income_statement | A (مصدر الشركة) | A1 |
| `cost_of_revenue` * | income_statement | A (مصدر الشركة) | A1 |
| `discontinued_operations_income` | income_statement | D (استبعاد مراجَع) | A7 |
| `gain_loss_asset_sales` * | income_statement | A (مصدر الشركة) | A1 |
| `general_and_administrative_expense` * | income_statement | A (مصدر الشركة) | A1 |
| `gross_profit` | income_statement | D (استبعاد مراجَع) | A7 |
| `interest_expense` * | income_statement | A (مصدر الشركة) | A1 |
| `other_expense` * | income_statement | A (مصدر الشركة) | A1 |
| `other_income` * | income_statement | A (مصدر الشركة) | A1 |
| `other_nonoperating_expense` * | income_statement | A (مصدر الشركة) | A1 |
| `other_nonoperating_income` * | income_statement | A (مصدر الشركة) | A1 |
| `selling_and_distribution_expense` * | income_statement | A (مصدر الشركة) | A1 |

## profitability — الوزن 6، الحد 85%، موجود 15/23

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `economic_profit_proxy` * | profitability | B (حساب داخلي) | A5 |
| `gross_margin` * | profitability | B (حساب داخلي) | A5 |
| `incremental_roic` * | profitability | B (حساب داخلي) | A5 |
| `margin_expansion` * | profitability | B (حساب داخلي) | A5 |
| `nopat` * | profitability | B (حساب داخلي) | A5 |
| `return_on_capital` * | profitability | B (حساب داخلي) | A5 |
| `return_on_capital_employed` * | profitability | B (حساب داخلي) | A5 |
| `return_on_invested_capital` * | profitability | B (حساب داخلي) | A5 |

## liquidity_solvency — الوزن 5، الحد 90%، موجود 17/20

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `cfo_interest_coverage` * | liquidity_solvency | B (حساب داخلي) | A5 |
| `debt_service_coverage_proxy` * | liquidity_solvency | B (حساب داخلي) | A5 |
| `fixed_charge_coverage` * | liquidity_solvency | B (حساب داخلي) | A5 |

## efficiency — الوزن 4، الحد 85%، موجود 9/17

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `cash_conversion_cycle` * | efficiency | B (حساب داخلي) | A5 |
| `days_inventory` * | efficiency | B (حساب داخلي) | A5 |
| `days_payables` * | efficiency | B (حساب داخلي) | A5 |
| `fixed_asset_turnover` * | efficiency | B (حساب داخلي) | A5 |
| `inventory_to_revenue` * | efficiency | B (حساب داخلي) | A5 |
| `inventory_turnover` * | efficiency | B (حساب داخلي) | A5 |
| `payables_turnover` * | efficiency | B (حساب داخلي) | A5 |
| `working_capital_turnover` * | efficiency | B (حساب داخلي) | A5 |

## growth — الوزن 5، الحد 80%، موجود 15/35

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `book_value_growth` * | growth | B (حساب داخلي) | A5 |
| `ebitda_growth` * | growth | B (حساب داخلي) | A5 |
| `ebitda_qoq` * | growth | B (حساب داخلي) | A5 |
| `ebitda_ttm_growth` | growth | B (حساب داخلي) | A5 |
| `eps_cagr_5y` * | growth | B (حساب داخلي) | A5 |
| `eps_qoq` * | growth | B (حساب داخلي) | A5 |
| `eps_ttm_growth` | growth | B (حساب داخلي) | A5 |
| `free_cash_flow_per_share_growth` | growth | B (حساب داخلي) | A5 |
| `free_cash_flow_qoq` * | growth | B (حساب داخلي) | A5 |
| `free_cash_flow_ttm_growth` | growth | B (حساب داخلي) | A5 |
| `gross_profit_growth` * | growth | B (حساب داخلي) | A5 |
| `gross_profit_qoq` * | growth | B (حساب داخلي) | A5 |
| `net_income_qoq` * | growth | B (حساب داخلي) | A5 |
| `net_income_ttm_growth` | growth | B (حساب داخلي) | A5 |
| `operating_cash_flow_qoq` * | growth | B (حساب داخلي) | A5 |
| `operating_cash_flow_ttm_growth` | growth | B (حساب داخلي) | A5 |
| `operating_income_qoq` * | growth | B (حساب داخلي) | A5 |
| `revenue_per_share_growth` * | growth | B (حساب داخلي) | A5 |
| `revenue_qoq` * | growth | B (حساب داخلي) | A5 |
| `revenue_ttm_growth` | growth | B (حساب داخلي) | A5 |

## per_share — الوزن 3، الحد 90%، موجود 13/13

لا حقول ناقصة.

## valuation — الوزن 6، الحد 80%، موجود 15/31

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `ebit_estimate` * | consensus | C (ترخيص/تغذية) | A6 |
| `ebitda_estimate` * | consensus | C (ترخيص/تغذية) | A6 |
| `eps_estimate` * | consensus | C (ترخيص/تغذية) | A6 |
| `net_income_estimate` * | consensus | C (ترخيص/تغذية) | A6 |
| `revenue_estimate` * | consensus | C (ترخيص/تغذية) | A6 |
| `selling_general_administrative_expense_estimate` * | consensus | C (ترخيص/تغذية) | A6 |
| `cfo_yield` * | valuation | B (حساب داخلي) | A5 |
| `enterprise_value_to_fcf` * | valuation | B (حساب داخلي) | A5 |
| `enterprise_value_to_invested_capital` * | valuation | B (حساب داخلي) | A5 |
| `forward_price_to_earnings` * | valuation | C (ترخيص/تغذية) | A6 |
| `historical_pb_percentile` * | valuation | C (ترخيص/تغذية) | A6 |
| `historical_pe_percentile` * | valuation | C (ترخيص/تغذية) | A6 |
| `market_cap_to_equity` * | valuation | B (حساب داخلي) | A5 |
| `market_cap_to_net_income` * | valuation | B (حساب داخلي) | A5 |
| `peg_ratio` * | valuation | C (ترخيص/تغذية) | A6 |
| `shareholder_yield` * | valuation | B (حساب داخلي) | A5 |

## market_data — الوزن 5، الحد 85%، موجود 7/26

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `average_volume_30d` * | market_data | C (ترخيص/تغذية) | A6 |
| `beta_1y` * | market_data | C (ترخيص/تغذية) | A6 |
| `beta_5y` * | market_data | C (ترخيص/تغذية) | A6 |
| `fifty_two_week_high` * | market_data | C (ترخيص/تغذية) | A6 |
| `fifty_two_week_low` * | market_data | C (ترخيص/تغذية) | A6 |
| `free_float_market_cap` * | market_data | C (ترخيص/تغذية) | A6 |
| `free_float_shares` * | market_data | C (ترخيص/تغذية) | A6 |
| `market_return_1m` * | market_data | C (ترخيص/تغذية) | A6 |
| `market_return_1y` * | market_data | C (ترخيص/تغذية) | A6 |
| `market_return_3m` * | market_data | C (ترخيص/تغذية) | A6 |
| `market_return_3y` * | market_data | C (ترخيص/تغذية) | A6 |
| `market_return_5y` | market_data | C (ترخيص/تغذية) | A6 |
| `market_return_6m` * | market_data | C (ترخيص/تغذية) | A6 |
| `market_return_ytd` * | market_data | C (ترخيص/تغذية) | A6 |
| `percent_from_52w_high` * | market_data | C (ترخيص/تغذية) | A6 |
| `percent_from_52w_low` * | market_data | C (ترخيص/تغذية) | A6 |
| `previous_close` * | market_data | C (ترخيص/تغذية) | A6 |
| `price_adjusted_close` * | market_data | C (ترخيص/تغذية) | A6 |
| `volatility_30d` * | market_data | C (ترخيص/تغذية) | A6 |

## dividends — الوزن 5، الحد 90%، موجود 4/20

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `dividend_cagr_5y` * | dividends | B (حساب داخلي) | A5 |
| `dividend_installments_count` * | dividends | B (حساب داخلي) | A5 |
| `dividend_payment_frequency` * | dividends | B (حساب داخلي) | A5 |
| `dividend_per_share_ttm` * | dividends | B (حساب داخلي) | A5 |
| `dividend_stability_score` * | dividends | B (حساب داخلي) | A5 |
| `dividend_yield_ttm` * | dividends | B (حساب داخلي) | A5 |
| `fcf_payout_ratio_ttm` * | dividends | B (حساب داخلي) | A5 |
| `forward_dividend_per_share` * | dividends | B (حساب داخلي) | A5 |
| `forward_dividend_run_rate` * | dividends | B (حساب داخلي) | A5 |
| `ordinary_dividend` * | dividends | B (حساب داخلي) | A5 |
| `payout_ratio_ttm` * | dividends | B (حساب داخلي) | A5 |
| `special_dividend` | dividends | D (استبعاد مراجَع) | A7 |
| `total_dividend_declared` * | dividends | B (حساب داخلي) | A5 |
| `total_dividend_paid_ttm` * | dividends | B (حساب داخلي) | A5 |
| `trailing_twelve_month_dividend` * | dividends | B (حساب داخلي) | A5 |
| `years_consecutive_dividend_payments` * | dividends | B (حساب داخلي) | A5 |

## segments — الوزن 4، الحد 75%، موجود 24/45

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `average_selling_price_by_product` | commercial_pipeline | A (مصدر الشركة) | A2 |
| `book_to_bill_ratio` | commercial_pipeline | D (استبعاد مراجَع) | A7 |
| `committed_offtake_volume` | commercial_pipeline | A (مصدر الشركة) | A2 |
| `contract_renewal_profile` | commercial_pipeline | D (استبعاد مراجَع) | A7 |
| `contracted_sales_value` | commercial_pipeline | D (استبعاد مراجَع) | A7 |
| `contracted_sales_volume` | commercial_pipeline | D (استبعاد مراجَع) | A7 |
| `minimum_volume_commitments` | commercial_pipeline | D (استبعاد مراجَع) | A7 |
| `sales_contract_count` | commercial_pipeline | D (استبعاد مراجَع) | A7 |
| `sales_order_backlog` | commercial_pipeline | D (استبعاد مراجَع) | A7 |
| `sales_volume_by_geography` | commercial_pipeline | A (مصدر الشركة) | A2 |
| `sales_volume_by_product` | commercial_pipeline | A (مصدر الشركة) | A2 |
| `take_or_pay_commitments` | commercial_pipeline | D (استبعاد مراجَع) | A7 |
| `chemicals_revenue` * | segments | A (مصدر الشركة) | A2 |
| `downstream_operating_income` * | segments | A (مصدر الشركة) | A2 |
| `lng_revenue` * | segments | A (مصدر الشركة) | A2 |
| `refined_products_revenue` * | segments | A (مصدر الشركة) | A2 |
| `segment_assets` * | segments | A (مصدر الشركة) | A2 |
| `segment_impairment` * | segments | A (مصدر الشركة) | A2 |
| `segment_investments_associates` * | segments | A (مصدر الشركة) | A2 |
| `segment_liabilities` * | segments | A (مصدر الشركة) | A2 |
| `upstream_operating_income` * | segments | A (مصدر الشركة) | A2 |

## ownership — الوزن 5، الحد 85%، موجود 6/18

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `foreign_investor_limit` * | ownership | C (ترخيص/تغذية) | A6 |
| `foreign_ownership` * | ownership | C (ترخيص/تغذية) | A6 |
| `insider_ownership` * | ownership | A (مصدر الشركة) | A4 |
| `institutional_ownership` * | ownership | C (ترخيص/تغذية) | A6 |
| `institutional_shareholders_count` * | ownership | C (ترخيص/تغذية) | A6 |
| `major_holder_change` * | ownership | A (مصدر الشركة) | A4 |
| `ownership_concentration` * | ownership | A (مصدر الشركة) | A4 |
| `retail_ownership` * | ownership | C (ترخيص/تغذية) | A6 |
| `retail_shareholders_count` * | ownership | C (ترخيص/تغذية) | A6 |
| `strategic_ownership` * | ownership | A (مصدر الشركة) | A4 |
| `top_10_shareholder_concentration` * | ownership | A (مصدر الشركة) | A4 |
| `top_5_shareholder_concentration` * | ownership | A (مصدر الشركة) | A4 |

## corporate_actions — الوزن 4، الحد 90%، موجود 6/21

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `capital_reduction` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `delisting` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `dividend_eligibility` * | corporate_actions | A (مصدر الشركة) | A4 |
| `dividend_ex_date` * | corporate_actions | A (مصدر الشركة) | A4 |
| `dividend_payment` * | corporate_actions | A (مصدر الشركة) | A4 |
| `merger` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `reverse_split` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `rights_issue` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `rights_offering_date` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `spin_off` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `stock_split` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `suspension` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `symbol_change` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `tender_offer` | corporate_actions | D (استبعاد مراجَع) | A7 |
| `treasury_share_sale` | corporate_actions | D (استبعاد مراجَع) | A7 |

## announcements — الوزن 5، الحد 80%، موجود 8/28

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `announcement_body` * | disclosures | A (مصدر الشركة) | A4 |
| `announcement_category` * | disclosures | A (مصدر الشركة) | A4 |
| `announcement_date` * | disclosures | A (مصدر الشركة) | A4 |
| `announcement_id` * | disclosures | A (مصدر الشركة) | A4 |
| `announcement_source_url` * | disclosures | A (مصدر الشركة) | A4 |
| `announcement_title_ar` * | disclosures | A (مصدر الشركة) | A4 |
| `announcement_title_en` * | disclosures | A (مصدر الشركة) | A4 |
| `board_change` * | disclosures | A (مصدر الشركة) | A4 |
| `contract_award` * | disclosures | A (مصدر الشركة) | A4 |
| `contract_flag` * | disclosures | A (مصدر الشركة) | A4 |
| `dividend_flag` * | disclosures | A (مصدر الشركة) | A4 |
| `earnings_flag` * | disclosures | A (مصدر الشركة) | A4 |
| `governance_flag` * | disclosures | A (مصدر الشركة) | A4 |
| `litigation` | disclosures | D (استبعاد مراجَع) | A7 |
| `management_change` * | disclosures | A (مصدر الشركة) | A4 |
| `materiality_tag` * | disclosures | A (مصدر الشركة) | A4 |
| `merger_acquisition_flag` * | disclosures | A (مصدر الشركة) | A4 |
| `regulatory_action` | disclosures | D (استبعاد مراجَع) | A7 |
| `related_financial_period` * | disclosures | A (مصدر الشركة) | A4 |
| `related_party_transaction` * | disclosures | A (مصدر الشركة) | A4 |

## operational_kpis — الوزن 7، الحد 85%، موجود 31/46

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `average_realized_gas_price` | oil_gas_operations | A (مصدر الشركة) | A2 |
| `average_realized_refined_product_price` | oil_gas_operations | A (مصدر الشركة) | A2 |
| `chemicals_production` | oil_gas_operations | A (مصدر الشركة) | A2 |
| `chemicals_sales` | oil_gas_operations | A (مصدر الشركة) | A2 |
| `condensate_production` * | oil_gas_operations | A (مصدر الشركة) | A2 |
| `crude_oil_production` * | oil_gas_operations | A (مصدر الشركة) | A2 |
| `finding_development_cost_per_boe` | oil_gas_operations | D (استبعاد مراجَع) | A7 |
| `lifting_volume` * | oil_gas_operations | A (مصدر الشركة) | A2 |
| `natural_gas_liquids_production` * | oil_gas_operations | A (مصدر الشركة) | A2 |
| `natural_gas_sales` * | oil_gas_operations | A (مصدر الشركة) | A2 |
| `production_entitlement` | oil_gas_operations | D (استبعاد مراجَع) | A7 |
| `refinery_throughput` * | oil_gas_operations | A (مصدر الشركة) | A2 |
| `refinery_utilization` | oil_gas_operations | A (مصدر الشركة) | A2 |
| `reserve_replacement_ratio` | oil_gas_operations | D (استبعاد مراجَع) | A7 |
| `spare_capacity` | oil_gas_operations | A (مصدر الشركة) | A2 |

## sector_specific_fields — الوزن 7، الحد 90%، موجود 23/32

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `chemicals_revenue` * | segments | A (مصدر الشركة) | A2 |
| `downstream_operating_income` * | segments | A (مصدر الشركة) | A2 |
| `lng_revenue` * | segments | A (مصدر الشركة) | A2 |
| `refined_products_revenue` * | segments | A (مصدر الشركة) | A2 |
| `segment_assets` * | segments | A (مصدر الشركة) | A2 |
| `segment_impairment` * | segments | A (مصدر الشركة) | A2 |
| `segment_investments_associates` * | segments | A (مصدر الشركة) | A2 |
| `segment_liabilities` * | segments | A (مصدر الشركة) | A2 |
| `upstream_operating_income` * | segments | A (مصدر الشركة) | A2 |

## calculated_smart_metrics — الوزن 5، الحد 90%، موجود 14/30

| الحقل | المجموعة | الصنف | الدفعة |
|---|---|---|---|
| `beneish_m_score` | investor_analytics | B (حساب داخلي) | A5 |
| `dividend_cagr_10y` * | investor_analytics | H (تاريخ 10 سنوات) | A8 |
| `eps_cagr_10y` * | investor_analytics | H (تاريخ 10 سنوات) | A8 |
| `free_cash_flow_cagr_10y` * | investor_analytics | H (تاريخ 10 سنوات) | A8 |
| `net_income_cagr_10y` * | investor_analytics | H (تاريخ 10 سنوات) | A8 |
| `operating_cash_flow_cagr_10y` * | investor_analytics | H (تاريخ 10 سنوات) | A8 |
| `price_to_sma_200d` | investor_analytics | C (ترخيص/تغذية) | A6 |
| `price_to_sma_50d` | investor_analytics | C (ترخيص/تغذية) | A6 |
| `return_on_tangible_assets` * | investor_analytics | B (حساب داخلي) | A5 |
| `revenue_cagr_10y` * | investor_analytics | H (تاريخ 10 سنوات) | A8 |
| `simple_moving_average_200d` * | investor_analytics | C (ترخيص/تغذية) | A6 |
| `simple_moving_average_50d` * | investor_analytics | C (ترخيص/تغذية) | A6 |
| `total_return_10y` * | investor_analytics | C (ترخيص/تغذية) | A6 |
| `total_return_1y` * | investor_analytics | C (ترخيص/تغذية) | A6 |
| `total_return_3y` * | investor_analytics | C (ترخيص/تغذية) | A6 |
| `total_return_5y` * | investor_analytics | C (ترخيص/تغذية) | A6 |

## sources_lineage_freshness

فئة متقاطعة بلا حقول؛ تُقاس بالمصادر والحداثة.

