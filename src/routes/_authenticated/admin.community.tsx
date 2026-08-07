import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/community")({
  component: CommunityAdmin,
});

type Report = {
  id: string;
  target_type: "post" | "comment";
  target_id: string;
  reason: string | null;
  status: string;
  created_at: string;
};

function CommunityAdmin() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const reportsQuery = useQuery({
    queryKey: ["admin_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_reports")
        .select("id, target_type, target_id, reason, status, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Report[];
    },
  });

  const contentQuery = useQuery({
    queryKey: ["admin_reports_content", reportsQuery.data?.map((r) => r.id).join(",")],
    enabled: !!reportsQuery.data?.length,
    queryFn: async () => {
      const posts = reportsQuery
        .data!.filter((r) => r.target_type === "post")
        .map((r) => r.target_id);
      const comments = reportsQuery
        .data!.filter((r) => r.target_type === "comment")
        .map((r) => r.target_id);
      const [postsRes, commentsRes] = await Promise.all([
        posts.length
          ? supabase.from("community_posts").select("id, title").in("id", posts)
          : Promise.resolve({ data: [] }),
        comments.length
          ? supabase.from("community_comments").select("id, body").in("id", comments)
          : Promise.resolve({ data: [] }),
      ]);
      const map = new Map<string, string>();
      (postsRes.data ?? []).forEach((p) => map.set(p.id, p.title));
      (commentsRes.data ?? []).forEach((c) => map.set(c.id, c.body));
      return map;
    },
  });

  const dismiss = async (report: Report) => {
    setBusyId(report.id);
    try {
      const { error } = await supabase
        .from("community_reports")
        .update({ status: "dismissed" })
        .eq("id", report.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin_reports"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteContent = async (report: Report) => {
    setBusyId(report.id);
    try {
      const table = report.target_type === "post" ? "community_posts" : "community_comments";
      const { error: deleteError } = await supabase.from(table).delete().eq("id", report.target_id);
      if (deleteError) throw deleteError;
      const { error: reportError } = await supabase
        .from("community_reports")
        .update({ status: "resolved" })
        .eq("id", report.id);
      if (reportError) throw reportError;
      queryClient.invalidateQueries({ queryKey: ["admin_reports"] });
      toast.success(t({ ar: "تم حذف المحتوى.", en: "Content deleted." }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">
        {t({ ar: "إشراف المجتمع", en: "Community moderation" })}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {t({
          ar: "المنشورات والتعليقات المُبلَّغ عنها من المستخدمين.",
          en: "Posts and comments flagged by users.",
        })}
      </p>

      {reportsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">{t({ ar: "يحمّل...", en: "Loading..." })}</p>
      )}

      {reportsQuery.data && reportsQuery.data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t({ ar: "لا توجد بلاغات مفتوحة حالياً.", en: "No open reports right now." })}
        </p>
      )}

      <div className="space-y-3">
        {reportsQuery.data?.map((r) => (
          <div key={r.id} className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {r.target_type === "post"
                  ? t({ ar: "منشور", en: "Post" })
                  : t({ ar: "تعليق", en: "Comment" })}{" "}
                · {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mb-3 line-clamp-3 text-sm">
              {contentQuery.data?.get(r.target_id) ??
                t({ ar: "(المحتوى محذوف مسبقاً)", en: "(content already removed)" })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteContent(r)}
                disabled={busyId === r.id}
                className="rounded-lg bg-tone-rose px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {t({ ar: "حذف المحتوى", en: "Delete content" })}
              </button>
              <button
                onClick={() => dismiss(r)}
                disabled={busyId === r.id}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
              >
                {t({ ar: "تجاهل البلاغ", en: "Dismiss report" })}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
