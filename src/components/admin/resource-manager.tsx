import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { createRow, deleteRow, listRows, updateRow, type CmsRow, type CmsTable } from "@/lib/cms";
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
  | "json";

export type Field = {
  key: string;
  label: LocalizedText;
  type: FieldType;
  optionsKey?: string;
  help?: LocalizedText;
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
};

export type OptionSet = Record<string, { value: string; label: string }[]>;

const emptyLocalized = { ar: "", en: "" };

function toFormValue(field: Field, raw: unknown) {
  if (field.type === "json") return JSON.stringify(raw ?? [], null, 2);
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

  const listQuery = useQuery({
    queryKey: ["cms", config.table],
    queryFn: () => listRows(config.table, config.orderBy ?? "created_at"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["cms", config.table] });

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
    for (const f of config.fields) {
      const value = form[f.key];
      if (f.type === "json") {
        try {
          payload[f.key] = JSON.parse(String(value || "[]"));
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
          {raw
            ? t({ ar: "منشور", en: "Published" })
            : t({ ar: "مسودة", en: "Draft" })}
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
                {config.listColumns.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-start font-medium">
                    {t(c.label)}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/70 hover:bg-muted/30">
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

                  {f.type === "localized" || f.type === "localizedLong" ? (
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

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t({ ar: "تأكيد الحذف", en: "Confirm delete" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t({ ar: "لا يمكن التراجع عن هذا الإجراء.", en: "This action cannot be undone." })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t({ ar: "إلغاء", en: "Cancel" })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              {t({ ar: "حذف", en: "Delete" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
