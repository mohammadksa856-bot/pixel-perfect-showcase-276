import { createFileRoute } from "@tanstack/react-router";
import { ResourceManager } from "@/components/admin/resource-manager";
import { knowledgeResource } from "@/lib/admin-resources";

export const Route = createFileRoute("/_authenticated/admin/knowledge")({
  component: () => <ResourceManager config={knowledgeResource} />,
});
