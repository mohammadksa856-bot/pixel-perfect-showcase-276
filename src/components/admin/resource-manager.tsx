import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createRow,
  deleteRow,
  listRows,
  swapSortOrder,
  updateRow,
  uploadContentImage,
  type CmsRow,
  type CmsTable,
} from "@/lib/cms";
import { useI18n, type LocalizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type FieldType =
  | "text"
  | "textarea"
  | "localized"
  | "localizedLong"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "json"
  | "image"
  | "list";

/** A single editable column inside a `list` field's row editor. */
export type ListItemColumn = {
  key: string;
  label: LocalizedText;
  /** "localized" renders a paired ar/en input; the rest are single inputs. */
  kind?: "text" | "number" | "localized" | "select";
  options?: { value: string; label: LocalizedText }[];
  placeholder?: string;
};

export type Field = {
  key: string;
  label: LocalizedText;
  type: FieldType;
  optionsKey?: string;
  help?: LocalizedText;
  /** Required for `list` fields: describes the shape of each row. */
  itemColumns?: ListItemColumn[];
};

export type ListColumn = {
  key: string;
  label: LocalizedText;
  kind?: "text" | "localized" | "boolean" | "lookup";
  optionsKey?: string;
};

export type ResourceConfig = {
  table: CmsTable;
  singular: LocalizedText;
  orderBy?: string;
  fields: Field[];
  listColumns: ListColumn[];
  defaults: () => Record<string, unknown>;
  reorderable?: boolean;
};

export type OptionSet = Record<string, { value: string; label: string }[]>;

const emptyLocalized = { ar: "", en: "" };

function toFormValue(field: Field, raw: unknown) {
  if (field.type === "list") return Array.isArray(raw) ? raw : [];
  if (field.type === "json") {
    // Preserve the original shape: an object field must stay {} when empty,
    // otherwise saving would silently turn it into [] and break the page.
    const fallback = raw === null || raw === undefined ? [] : raw;
    return JSON.stringify(fallback, null, 2);
  }
  if (field.type === "localized" || field.type === "localizedLong") {
    const v = (raw ?? emptyLocalized) as { ar?: string; en?: string };
    return { ar: v.ar ?? "", en: v.en ?? "" };
  }
  return raw ?? "";
}

export function ResourceManager({
  config,
  options = {},
}: {
  config: ResourceConfig;
  options?: OptionSet;
}) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CmsRow | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [deleteTarget, setDeleteTarget] = useState<CmsRow | null>(null);
  const [search, setSearch] = useState("");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["cms", config.table],
    queryFn: () => listRows(config.table, config.orderBy ?? "created_at"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cms", config.table] });

  const reorderMutation = useMutation({
    mutationFn: ({ a, b }: { a: CmsRow; b: CmsRow }) =>
      swapSortOrder(
        config.table,
        { id: a.id, sort_order: Number(a["sort_order"] ?? 0) },
        { id: b.id, sort_order: Number(b["sort_order"] ?? 0) },
      ),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing) await updateRow(config.table, editing.id, payload);
      else await createRow(config.table, payload);
    },
    onSuccess: () => {
      toast.success(t({ ar: "تم الحفظ", en: "Saved" }));
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (row: CmsRow) => deleteRow(config.table, row.id),
    onSuccess: () => {
      toast.success(t({ ar: "تم الحذف", en: "Deleted" }));
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startCreate = () => {
    setEditing(null);
    const defaults = config.defaults();
    const next: Record<string, unknown> = {};
    for (const f of config.fields) next[f.key] = toFormValue(f, defaults[f.key]);
    setForm(next);
    setOpen(true);
  };

  const startEdit = (row: CmsRow) => {
    setEditing(row);
    const next: Record<string, unknown> = {};
    for (const f of config.fields) next[f.key] = toFormValue(f, row[f.key]);
    setForm(next);
    setOpen(true);
  };

  const submit = () => {
    const payload: Record<string, unknown> = {};
    const defaults = config.defaults();
    for (const f of config.fields) {
      const value = form[f.key];
      if (f.type === "list") {
        payload[f.key] = Array.isArray(value) ? value : [];
      } else if (f.type === "json") {
        const text = String(value ?? "").trim();
        if (!text) {
          // Empty input: fall back to this field's own default shape
          // ({} stays {}, [] stays []) instead of forcing an array.
          payload[f.key] = defaults[f.key] ?? [];
          continue;
        }
        try {
          payload[f.key] = JSON.parse(text);
        } catch {
          toast.error(`${t(f.label)}: ${t({ ar: "صيغة JSON غير صحيحة", en: "Invalid JSON" })}`);
          return;
        }
      } else if (f.type === "number") {
        payload[f.key] = Number(value) || 0;
      } else if (f.type === "select") {
        payload[f.key] = value === "" ? null : value;
      } else {
        payload[f.key] = value;
      }
    }
    saveMutation.mutate(payload);
  };

  const rows = useMemo(() => {
    const all = listQuery.data ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [listQuery.data, search]);

  const renderCell = (row: CmsRow, col: ListColumn) => {
    const raw = row[col.key];
    if (col.kind === "boolean")
      return (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            raw ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground",
          )}
        >
          {raw ? t({ ar: "منشور", en: "Published" }) : t({ ar: "مسودة", en: "Draft" })}
        </span>
      );
    if (col.kind === "localized") {
      const v = (raw ?? emptyLocalized) as Record<string, string>;
      return v[locale] || v["en"] || v["ar"] || "—";
    }
    if (col.kind === "lookup" && col.optionsKey) {
      const opt = (options[col.optionsKey] ?? []).find((o) => o.value === raw);
      return opt?.label ?? "—";
    }
    return raw ? String(raw) : "—";
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t({ ar: "بحث…", en: "Search…" })}
          className="max-w-xs"
        />
        <Button onClick={startCreate} className="ms-auto gap-2">
          <Plus className="size-4" />
          {t({ ar: "إضافة", en: "New" })} {t(config.singular)}
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t({ ar: "جارِ التحميل…", en: "Loading…" })}
        </div>
      ) : listQuery.error ? (
        <p className="py-10 text-sm text-destructive">{(listQuery.error as Error).message}</p>
      ) : !rows.length ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          {t({ ar: "لا توجد عناصر بعد.", en: "Nothing here yet." })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-start text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {config.reorderable && <th className="w-16 px-4 py-3" />}
                {config.listColumns.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-start font-medium">
                    {t(c.label)}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className="border-t border-border/70 hover:bg-muted/30">
                  {config.reorderable && (
                    <td className="px-4 py-3">
                      {search.trim() ? null : (
                        <div className="flex flex-col gap-0.5">
                          <button
                            disabled={i === 0 || reorderMutation.isPending}
                            onClick={() => reorderMutation.mutate({ a: row, b: rows[i - 1]! })}
                            className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                          >
                            <ArrowUp className="size-3.5" />
                          </button>
                          <button
                            disabled={i === rows.length - 1 || reorderMutation.isPending}
                            onClick={() => reorderMutation.mutate({ a: row, b: rows[i + 1]! })}
                            className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                          >
                            <ArrowDown className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                  {config.listColumns.map((c) => (
                    <td key={c.key} className="px-4 py-3 align-middle">
                      {renderCell(row, c)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(row)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(row)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `${t({ ar: "تعديل", en: "Edit" })} ${t(config.singular)}`
                : `${t({ ar: "إضافة", en: "New" })} ${t(config.singular)}`}
            </DialogTitle>
            <DialogDescription>
              {t({
                ar: "الحقول ثنائية اللغة تُحفظ بالعربية والإنجليزية معاً.",
                en: "Bilingual fields are stored in both Arabic and English.",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            {config.fields.map((f) => {
              const value = form[f.key];
              const set = (v: unknown) => setForm((s) => ({ ...s, [f.key]: v }));
              return (
                <div key={f.key} className="grid gap-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    {t(f.label)}
                  </label>

                  {f.type === "list" ? (
                    <ListEditor
                      columns={f.itemColumns ?? []}
                      rows={(Array.isArray(value) ? value : []) as Record<string, unknown>[]}
                      onChange={set}
                    />
                  ) : f.type === "image" ? (
                    <div className="flex items-center gap-3">
                      {value ? (
                        <div className="relative">
                          <img
                            src={String(value)}
                            alt=""
                            className="size-20 rounded-lg border border-border object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => set("")}
                            className="absolute -end-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex size-20 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                          <ImagePlus className="size-5" />
                        </div>
                      )}
                      <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted">
                        {uploadingKey === f.key ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          t({ ar: "اختر صورة", en: "Choose image" })
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingKey === f.key}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingKey(f.key);
                            try {
                              const url = await uploadContentImage(file);
                              set(url);
                            } catch (err) {
                              toast.error((err as Error).message);
                            } finally {
                              setUploadingKey(null);
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : f.type === "localized" || f.type === "localizedLong" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(["ar", "en"] as const).map((l) => {
                        const lv = (value ?? emptyLocalized) as Record<string, string>;
                        const common = {
                          value: lv[l] ?? "",
                          dir: l === "ar" ? ("rtl" as const) : ("ltr" as const),
                          placeholder: l === "ar" ? "العربية" : "English",
                          onChange: (
                            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                          ) => set({ ...lv, [l]: e.target.value }),
                        };
                        return f.type === "localizedLong" ? (
                          <Textarea key={l} rows={4} {...common} />
                        ) : (
                          <Input key={l} {...common} />
                        );
                      })}
                    </div>
                  ) : f.type === "boolean" ? (
                    <Switch checked={Boolean(value)} onCheckedChange={(v) => set(v)} />
                  ) : f.type === "select" ? (
                    <select
                      value={String(value ?? "")}
                      onChange={(e) => set(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">—</option>
                      {(options[f.optionsKey ?? ""] ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "json" ? (
                    <Textarea
                      dir="ltr"
                      rows={8}
                      className="font-mono text-xs"
                      value={String(value ?? "")}
                      onChange={(e) => set(e.target.value)}
                    />
                  ) : f.type === "textarea" ? (
                    <Textarea
                      rows={3}
                      value={String(value ?? "")}
                      onChange={(e) => set(e.target.value)}
                    />
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      value={String(value ?? "")}
                      onChange={(e) => set(e.target.value)}
                    />
                  )}

                  {f.help && <p className="text-[11px] text-muted-foreground">{t(f.help)}</p>}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t({ ar: "إلغاء", en: "Cancel" })}
            </Button>
            <Button onClick={submit} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="me-2 size-4 animate-spin" />}
              {t({ ar: "حفظ", en: "Save" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t({ ar: "تأكيد الحذف", en: "Confirm delete" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t({ ar: "لا يمكن التراجع عن هذا الإجراء.", en: "This action cannot be undone." })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t({ ar: "إلغاء", en: "Cancel" })}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}>
              {t({ ar: "حذف", en: "Delete" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Row-based editor for array fields — replaces hand-editing raw JSON.
 * Each row renders one input per configured column; bilingual columns
 * render a paired ar/en input.
 */
function ListEditor({
  columns,
  rows,
  onChange,
}: {
  columns: ListItemColumn[];
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const { t } = useI18n();

  const blankRow = () => {
    const r: Record<string, unknown> = {};
    for (const c of columns) r[c.key] = c.kind === "localized" ? { ar: "", en: "" } : "";
    return r;
  };

  const updateCell = (rowIndex: number, key: string, val: unknown) => {
    const next = rows.map((r, i) => (i === rowIndex ? { ...r, [key]: val } : r));
    onChange(next);
  };

  const removeRow = (rowIndex: number) => onChange(rows.filter((_, i) => i !== rowIndex));

  const moveRow = (rowIndex: number, dir: -1 | 1) => {
    const target = rowIndex + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [moved] = next.splice(rowIndex, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
          {t({ ar: "لا توجد عناصر بعد.", en: "No items yet." })}
        </p>
      )}

      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t({ ar: "عنصر", en: "Item" })} {rowIndex + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveRow(rowIndex, -1)}
                disabled={rowIndex === 0}
                className="rounded p-1 hover:bg-muted disabled:opacity-30"
                title={t({ ar: "لأعلى", en: "Move up" })}
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveRow(rowIndex, 1)}
                disabled={rowIndex === rows.length - 1}
                className="rounded p-1 hover:bg-muted disabled:opacity-30"
                title={t({ ar: "لأسفل", en: "Move down" })}
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => removeRow(rowIndex)}
                className="rounded p-1 text-destructive hover:bg-destructive/10"
                title={t({ ar: "حذف", en: "Remove" })}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="grid gap-2.5">
            {columns.map((col) => {
              const cell = row[col.key];
              if (col.kind === "localized") {
                const v = (cell ?? { ar: "", en: "" }) as { ar?: string; en?: string };
                return (
                  <div key={col.key} className="grid gap-1.5">
                    <span className="text-[11px] text-muted-foreground">{t(col.label)}</span>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <Input
                        value={v.ar ?? ""}
                        onChange={(e) =>
                          updateCell(rowIndex, col.key, { ...v, ar: e.target.value })
                        }
                        placeholder="عربي"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={v.en ?? ""}
                        onChange={(e) =>
                          updateCell(rowIndex, col.key, { ...v, en: e.target.value })
                        }
                        placeholder="English"
                        dir="ltr"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                );
              }

              if (col.kind === "select") {
                return (
                  <div key={col.key} className="grid gap-1.5">
                    <span className="text-[11px] text-muted-foreground">{t(col.label)}</span>
                    <select
                      value={String(cell ?? "")}
                      onChange={(e) => updateCell(rowIndex, col.key, e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">—</option>
                      {(col.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {t(o.label)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={col.key} className="grid gap-1.5">
                  <span className="text-[11px] text-muted-foreground">{t(col.label)}</span>
                  <Input
                    type={col.kind === "number" ? "number" : "text"}
                    value={String(cell ?? "")}
                    onChange={(e) =>
                      updateCell(
                        rowIndex,
                        col.key,
                        col.kind === "number" ? Number(e.target.value) : e.target.value,
                      )
                    }
                    placeholder={col.placeholder ?? ""}
                    className="h-8 text-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, blankRow()])}
        className="justify-self-start"
      >
        <Plus className="size-3.5" />
        {t({ ar: "إضافة عنصر", en: "Add item" })}
      </Button>
    </div>
  );
}
