import { supabase } from "@/integrations/supabase/client";

/**
 * Thin CRUD layer over the CMS tables. Every admin screen goes through here so
 * the storage backend can change without touching UI code.
 */
export type CmsTable =
  "sectors" | "companies" | "research" | "knowledge_articles" | "faqs" | "community_boards";

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

/** Swaps sort_order between two rows — used for the up/down reorder controls. */
export async function swapSortOrder(
  table: CmsTable,
  a: { id: string; sort_order: number },
  b: { id: string; sort_order: number },
) {
  await Promise.all([
    updateRow(table, a.id, { sort_order: b.sort_order }),
    updateRow(table, b.id, { sort_order: a.sort_order }),
  ]);
}

/** Uploads a file to the shared content-images bucket and returns its public URL. */
export async function uploadContentImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("content-images").upload(path, file);
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("content-images").getPublicUrl(path);
  return data.publicUrl;
}
