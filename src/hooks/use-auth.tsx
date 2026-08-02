import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

/** Roles are stored server-side in `user_roles`; never trust local storage. */
export function useIsContentManager(userId: string | undefined) {
  const [state, setState] = useState<{ loading: boolean; allowed: boolean; isAdmin: boolean }>({
    loading: true,
    allowed: false,
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setState({ loading: false, allowed: false, isAdmin: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (cancelled) return;
        const roles = (data ?? []).map((r) => r.role);
        setState({
          loading: false,
          allowed: roles.includes("admin") || roles.includes("editor"),
          isAdmin: roles.includes("admin"),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
