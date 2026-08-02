import { createFileRoute } from "@tanstack/react-router";
import { ResourceManager } from "@/components/admin/resource-manager";
import { faqResource } from "@/lib/admin-resources";
import { useCmsOptions } from "@/hooks/use-cms-options";

export const Route = createFileRoute("/_authenticated/admin/faqs")({
  component: FaqsAdmin,
});

function FaqsAdmin() {
  return <ResourceManager config={faqResource} options={useCmsOptions()} />;
}
