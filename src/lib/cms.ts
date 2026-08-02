import { supabase } from "@/integrations/supabase/client";

/**
 * Thin CRUD layer over the CMS tables. Every admin screen goes through here so
 * the storage backend can change without touching UI code.
 */
export type CmsTable = "sectors" | "companies" | "research" | "knowledge_articles" | "faqs";

export type CmsRow = Record<string, unknown> & { id: string };

type AnyClient = {
  from: (table: string) => {
    select: (cols: string) => {
      order: (
        col: string,
        opts: { ascending: boolean },
      ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
    };
    insert: (row: unknown) => PromiseLike<{ error: { message: string } | null }>;
    update: (row: unknown) => {
      eq: (col: string, val: string) => PromiseLike<{ error: { message: string } | null }>;
    };
    delete: () => {
      eq: (col: string, val: string) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

const db = supabase as unknown as AnyClient;

export async function listRows(table: CmsTable, orderBy = "created_at"): Promise<CmsRow[]> {
  const { data, error } = await db.from(table).select("*").order(orderBy, { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CmsRow[];
}

export async function createRow(table: CmsTable, row: Record<string, unknown>) {
  const { error } = await db.from(table).insert(row);
  if (error) throw new Error(error.message);
}

export async function updateRow(table: CmsTable, id: string, row: Record<string, unknown>) {
  const { error } = await db.from(table).update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRow(table: CmsTable, id: string) {
  const { error } = await db.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
