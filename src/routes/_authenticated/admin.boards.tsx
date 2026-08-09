import { createFileRoute } from "@tanstack/react-router";
import { ResourceManager } from "@/components/admin/resource-manager";
import { boardResource } from "@/lib/admin-resources";
import { useCmsOptions } from "@/hooks/use-cms-options";

export const Route = createFileRoute("/_authenticated/admin/boards")({
  component: BoardsAdmin,
});

function BoardsAdmin() {
  return <ResourceManager config={boardResource} options={useCmsOptions()} />;
}
