import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default async function AuthenticatedLayout({ children }: AppLayoutProps) {
  await requireUser();

  return <AppShell>{children}</AppShell>;
}
