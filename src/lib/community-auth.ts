import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Returns the current user if signed in. If nobody is signed in, creates a
 * transparent anonymous session (no form shown) so the person can vote,
 * post, or comment immediately under a random pseudonym.
 */
export async function ensureCommunityUser(): Promise<User> {
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user;

  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) {
    throw new Error(
      "تعذّر إنشاء جلسة مؤقتة — تأكد إن خاصية Anonymous Sign-ins مفعّلة بإعدادات Supabase.",
    );
  }
  return anon.user;
}
