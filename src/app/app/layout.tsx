import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getCurrentHouseholdContext } from "@/lib/households";

type AppLayoutProps = {
  children: React.ReactNode;
  searchParams: Promise<{ household?: string }>;
};

export default async function AuthenticatedLayout({ children, searchParams }: AppLayoutProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await getCurrentHouseholdContext(user.id, params.household);

  return (
    <AppShell householdName={context?.household.name} currentHouseholdId={context?.household.id}>
      {children}
    </AppShell>
  );
}
