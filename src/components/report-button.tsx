import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ensureCommunityUser } from "@/lib/community-auth";
import { cn } from "@/lib/utils";

export function ReportButton({
  targetType,
  targetId,
  className,
}: {
  targetType: "post" | "comment";
  targetId: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);

  const report = async () => {
    if (reported || busy) return;
    setBusy(true);
    try {
      const user = await ensureCommunityUser();
      const { error } = await supabase
        .from("community_reports")
        .insert({ target_type: targetType, target_id: targetId, reporter_id: user.id });
      if (error) throw error;
      setReported(true);
      toast.success(
        t({ ar: "تم الإبلاغ، سيراجعه فريقنا.", en: "Reported — our team will review it." }),
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={report}
      disabled={reported || busy}
      title={t({ ar: "إبلاغ عن محتوى مسيء", en: "Report content" })}
      className={cn(
        "inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-tone-rose disabled:cursor-default disabled:hover:text-muted-foreground",
        className,
      )}
    >
      <Flag className={cn("size-3.5", reported && "fill-current text-tone-rose")} />
      {reported ? t({ ar: "تم الإبلاغ", en: "Reported" }) : t({ ar: "إبلاغ", en: "Report" })}
    </button>
  );
}
