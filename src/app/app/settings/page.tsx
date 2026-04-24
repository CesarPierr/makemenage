import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Globe,
  KeyRound,
  LayoutGrid,
  Users,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";

type SettingsPageProps = {
  searchParams: Promise<{ household?: string }>;
};

const panelMeta = [
  { id: "households", icon: LayoutGrid, label: "Foyers", description: "Changer, créer, rejoindre ou quitter un foyer.", requiredRole: null },
  { id: "team", icon: Users, label: "Équipe", description: "Gérer les membres et leurs profils.", requiredRole: null },
  { id: "access", icon: KeyRound, label: "Accès", description: "Créer et partager les invitations.", requiredRole: "admin" as const },
  { id: "planning", icon: Calendar, label: "Planning", description: "Absences et recalcul des tâches futures.", requiredRole: "admin" as const },
  { id: "integrations", icon: Globe, label: "Intégrations", description: "OpenClaw, IA locale et connectivité MCP.", requiredRole: "admin" as const },
  { id: "danger", icon: AlertTriangle, label: "Zone sensible", description: "Suppression définitive du foyer.", requiredRole: "owner" as const },
];

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);
  const manageable = canManageHousehold(context.membership.role);

  const visiblePanels = panelMeta.filter((panel) => {
    if (!panel.requiredRole) return true;
    if (panel.requiredRole === "admin") return manageable;
    if (panel.requiredRole === "owner") return context.membership.role === "owner";
    return false;
  });

  const householdParam = `?household=${context.household.id}`;

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {visiblePanels.map((panel) => {
        const Icon = panel.icon;

        return (
          <Link
            key={panel.id}
            href={`/app/settings/${panel.id}${householdParam}`}
            className="app-surface group relative flex flex-col justify-between overflow-hidden rounded-[2rem] p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative z-10">
              <div className="inline-flex rounded-2xl bg-[rgba(216,100,61,0.14)] p-3 text-[var(--coral-600)]">
                <Icon className="size-5" />
              </div>
              <h3 className="display-title mt-3 text-2xl group-hover:text-[var(--sky-600)] transition-colors">
                {panel.label}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">
                {panel.description}
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-[var(--sky-600)] opacity-0 group-hover:opacity-100 transition-opacity">
              Configurer <ArrowRight className="size-4" />
            </div>
            <div className="absolute -bottom-6 -right-6 size-32 rounded-full bg-[var(--sky-500)] opacity-[0.03] transition-transform group-hover:scale-150" />
          </Link>
        );
      })}
    </section>
  );
}
