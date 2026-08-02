import { createFileRoute } from "@tanstack/react-router";
import { ResourceManager } from "@/components/admin/resource-manager";
import { researchResource } from "@/lib/admin-resources";
import { useCmsOptions } from "@/hooks/use-cms-options";

export const Route = createFileRoute("/_authenticated/admin/research")({
  component: ResearchAdmin,
});

function ResearchAdmin() {
  return <ResourceManager config={researchResource} options={useCmsOptions()} />;
}
