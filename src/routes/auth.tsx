import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell, Container } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { denied: boolean } => ({
    denied: search["denied"] === true || search["denied"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | معرفة استثمار" },
      { name: "description", content: "سجّل الدخول لإدارة محتوى منصة معرفة استثمار." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const denied = search["denied"];
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (denied) {
      toast.error(
        t({
          ar: "حسابك مسجّل دخول لكن ما عنده صلاحية إدارة المحتوى.",
          en: "You're signed in, but this account doesn't have content-management access.",
        }),
      );
    }
  }, [denied, t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success(t({ ar: "تم إنشاء الحساب.", en: "Account created." }));
        navigate({ to: "/admin" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <Container>
        <div className="mx-auto max-w-sm rounded-2xl border border-border p-8">
          <h1 className="text-xl font-bold">
            {mode === "signin"
              ? t({ ar: "تسجيل الدخول", en: "Sign in" })
              : t({ ar: "إنشاء حساب", en: "Create account" })}
          </h1>
          <form onSubmit={submit} className="mt-6 grid gap-3">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t({ ar: "البريد الإلكتروني", en: "Email" })}
            />
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t({ ar: "كلمة المرور", en: "Password" })}
            />
            <Button type="submit" disabled={busy}>
              {t({ ar: "متابعة", en: "Continue" })}
            </Button>
          </form>
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 text-xs text-muted-foreground underline"
          >
            {mode === "signin"
              ? t({ ar: "ليس لديك حساب؟ أنشئ واحداً", en: "No account? Create one" })
              : t({ ar: "لديك حساب؟ سجّل الدخول", en: "Have an account? Sign in" })}
          </button>
        </div>
      </Container>
    </PageShell>
  );
}
