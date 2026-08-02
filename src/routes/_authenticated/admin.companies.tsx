import { createFileRoute } from "@tanstack/react-router";
import { ResourceManager } from "@/components/admin/resource-manager";
import { companyResource } from "@/lib/admin-resources";
import { useCmsOptions } from "@/hooks/use-cms-options";

export const Route = createFileRoute("/_authenticated/admin/companies")({
  component: CompaniesAdmin,
});

function CompaniesAdmin() {
  return <ResourceManager config={companyResource} options={useCmsOptions()} />;
}
