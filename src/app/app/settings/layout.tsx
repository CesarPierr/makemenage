import {
  AlertTriangle,
  Bell,
  Calendar,
  ClipboardList,
  Globe,
  History,
  KeyRound,
  LayoutGrid,
  Plane,
  Users,
} from "lucide-react";

import { SettingsTabs } from "@/components/settings/settings-tabs";
import { requireUser } from "@/lib/auth";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";

type SettingsLayoutProps = {
  children: React.ReactNode;
  params: Promise<Record<string, never>>;
};

const settingsPanels = [
  // Foyer group
  { id: "households", label: "Foyers", icon: LayoutGrid, description: "Changer, créer ou quitter un foyer.", requiredRole: null },
  { id: "team", label: "Équipe", icon: Users, description: "Membres et profils du foyer.", requiredRole: null },
  { id: "tasks", label: "Tâches", icon: ClipboardList, description: "Catalogue et création de routines.", requiredRole: "admin" as const },
  { id: "access", label: "Accès", icon: KeyRound, description: "Invitations et partage.", requiredRole: "admin" as const },
  { id: "planning", label: "Planning", icon: Calendar, description: "Absences et rééquilibrage.", requiredRole: "admin" as const },
  { id: "holidays", label: "Vacances", icon: Plane, description: "Périodes où tout le foyer est en pause.", requiredRole: "admin" as const },
  { id: "integrations", label: "Intégrations", icon: Globe, description: "OpenClaw et MCP.", requiredRole: "admin" as const },
  { id: "danger", label: "Danger", icon: AlertTriangle, description: "Suppression du foyer.", requiredRole: "owner" as const },
  // Moi group
  { id: "activity", label: "Activité", icon: History, description: "Ce qui a bougé dans le foyer.", requiredRole: null },
  { id: "notifications", label: "Notifs", icon: Bell, description: "Notifications push.", requiredRole: null },
] as const;

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const user = await requireUser();
  const context = await requireHouseholdContext(user.id);
  const manageable = canManageHousehold(context.membership.role);

  const visiblePanels = settingsPanels.filter((panel) => {
    if (!panel.requiredRole) return true;
    if (panel.requiredRole === "admin") return manageable;
    if (panel.requiredRole === "owner") return context.membership.role === "owner";
    return false;
  });

  return (
    <div className="space-y-4 lg:max-w-5xl">
      {/* Header */}
      <section className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Réglages</p>
        <h2 className="display-title mt-2 text-3xl leading-tight sm:text-4xl">Organisation du foyer</h2>

        <div className="mt-5 mobile-section-grid sm:grid-cols-3">
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-ink-700">Membres</p>
            <p className="mt-1 text-2xl font-semibold">{context.household.members.length}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-ink-700">Tâches actives</p>
            <p className="mt-1 text-2xl font-semibold">{context.tasks.length}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-ink-700">Mon rôle</p>
            <p className="mt-1 text-2xl font-semibold capitalize">{context.membership.role}</p>
          </div>
        </div>
      </section>

      {/* Tab navigation — scrollable on mobile */}
      <SettingsTabs
        householdId={context.household.id}
        panels={visiblePanels.map(({ id, label, description }) => ({ id, label, description }))}
      />

      {/* Active panel content */}
      {children}
    </div>
  );
}
