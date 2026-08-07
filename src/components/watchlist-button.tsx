import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ensureCommunityUser } from "@/lib/community-auth";
import { cn } from "@/lib/utils";

export function WatchlistButton({ companyId }: { companyId: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const watchQuery = useQuery({
    queryKey: ["watchlist_status", companyId],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data } = await supabase
        .from("watchlist")
        .select("company_id")
        .eq("company_id", companyId)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = async () => {
    setBusy(true);
    try {
      const user = await ensureCommunityUser();
      if (watchQuery.data) {
        const { error } = await supabase
          .from("watchlist")
          .delete()
          .eq("company_id", companyId)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success(t({ ar: "أُزيلت من المتابعة.", en: "Removed from watchlist." }));
      } else {
        const { error } = await supabase
          .from("watchlist")
          .insert({ company_id: companyId, user_id: user.id });
        if (error) throw error;
        toast.success(t({ ar: "أُضيفت لقائمة متابعتك.", en: "Added to your watchlist." }));
      }
      queryClient.invalidateQueries({ queryKey: ["watchlist_status", companyId] });
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60",
        watchQuery.data
          ? "border-brand bg-brand/10 text-brand"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      <Star className={cn("size-4", watchQuery.data && "fill-current")} />
      {watchQuery.data
        ? t({ ar: "متابَعة", en: "Watching" })
        : t({ ar: "تابع هذي الشركة", en: "Watch this company" })}
    </button>
  );
}
