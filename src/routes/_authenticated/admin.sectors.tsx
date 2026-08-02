import { createFileRoute } from "@tanstack/react-router";
import { ResourceManager } from "@/components/admin/resource-manager";
import { sectorResource } from "@/lib/admin-resources";

export const Route = createFileRoute("/_authenticated/admin/sectors")({
  component: () => <ResourceManager config={sectorResource} />,
});
