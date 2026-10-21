import { expect, mock, test } from "bun:test";

const failure = new Error("TEST_SOURCE_OFFLINE");
const query = {
  select() {
    return query;
  },
  eq() {
    return query;
  },
  order() {
    return Promise.resolve({ data: null, error: failure });
  },
  maybeSingle() {
    return Promise.resolve({ data: null, error: failure });
  },
};
mock.module("../../../../src/integrations/supabase/client", () => ({
  supabase: {
    from() {
      return query;
    },
  },
}));
const { getCompany, getCompanies } = await import("../../../../src/lib/content");

test("real company content accessor rejects source failure; no stored/demo fallback", async () => {
  await expect(getCompany("synthetic-company")).rejects.toBe(failure);
});
test("real company list accessor rejects source failure; no mock list fallback", async () => {
  await expect(getCompanies()).rejects.toBe(failure);
});
