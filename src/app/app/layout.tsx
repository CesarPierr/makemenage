import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";
import { ToastProvider } from "@/components/ui/toast";
import { requireUser } from "@/lib/auth";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default async function AuthenticatedLayout({ children }: AppLayoutProps) {
  await requireUser();

  return (
    <ToastProvider>
      <ServiceWorkerRegister />
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
