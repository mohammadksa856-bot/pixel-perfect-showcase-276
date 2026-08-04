import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { denied: false } });

    const { data: isManager, error: roleError } = await supabase.rpc("is_content_manager", {
      _user_id: data.user.id,
    });
    if (roleError || !isManager) throw redirect({ to: "/auth", search: { denied: true } });

    return { user: data.user };
  },
  component: () => <Outlet />,
});
