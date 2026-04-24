import dynamic from "next/dynamic";

import { ClientForm } from "@/components/client-form";
import { RecentActivityFeed } from "@/components/recent-activity-feed";
import { StatsDrawer } from "@/components/stats-drawer";
import { TaskWorkspaceClient } from "@/components/task-workspace-client";
import { buildLoadMetrics, buildRollingCompletionMetrics, calculateStreak } from "@/lib/analytics";
import { requireUser } from "@/lib/auth";
import { canManageHousehold, getCurrentHouseholdContext } from "@/lib/households";

const OnboardingWizard = dynamic(
  () => import("@/components/onboarding-wizard").then((m) => m.OnboardingWizard),
  { loading: () => <div className="app-surface rounded-[2rem] p-8 text-center text-[var(--ink-700)] text-sm">Chargement…</div> },
);

type DashboardPageProps = {
  searchParams: Promise<{ household?: string; onboarding?: string; joined?: string; join?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await getCurrentHouseholdContext(user.id, params.household);

  const dashboardMessage =
    params.joined === "1"
      ? "Nouveau foyer relié au compte. Vous pouvez maintenant passer d’un foyer à l’autre."
      : params.join === "invalid_code"
        ? "Code d’invitation introuvable ou expiré."
        : params.join === "invalid"
          ? "Lien d’invitation invalide ou expiré."
          : null;

  if (!context) {
    return (
      <section className="app-surface glow-card rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">Bienvenue</p>
        <h2 className="display-title mt-2 text-4xl leading-tight sm:text-5xl">Mettez votre foyer en route</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-700)]">
          Créez un foyer ou rejoignez-en un pour voir tout de suite ce qu&apos;il y a à faire aujourd&apos;hui.
        </p>
        {dashboardMessage ? (
          <div
            className="mt-5 rounded-[1.4rem] border px-4 py-3 text-sm leading-6 text-[var(--coral-600)]"
            style={{ backgroundColor: "rgba(216, 100, 61, 0.12)", borderColor: "rgba(30, 31, 34, 0.06)" }}
          >
            {dashboardMessage}
          </div>
        ) : null}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ClientForm
            action="/api/households"
            method="POST"
            className="soft-panel compact-form-grid p-4"
            successMessage="Foyer créé."
            errorMessage="Impossible de créer le foyer."
          >
            <h3 className="text-lg font-semibold">Créer un foyer</h3>
            <label className="field-label">
              <span>Nom</span>
              <input className="field" type="text" name="name" placeholder="Nom du foyer" required />
            </label>
            <label className="field-label">
              <span>Fuseau horaire</span>
              <input
                className="field"
                type="text"
                name="timezone"
                defaultValue={process.env.DEFAULT_TIMEZONE ?? "Europe/Paris"}
                required
              />
            </label>
            <button className="btn-primary px-5 py-3 font-semibold" type="submit">
              Créer le foyer
            </button>
          </ClientForm>

          <ClientForm
            action="/api/invitations/redeem"
            method="POST"
            className="soft-panel compact-form-grid p-4"
            successMessage="Invitation appliquée."
            errorMessage="Impossible de rejoindre ce foyer."
          >
            <h3 className="text-lg font-semibold">Rejoindre un foyer</h3>
            <label className="field-label">
              <span>Code</span>
              <input className="field" type="text" name="code" placeholder="Code d’invitation" required />
            </label>
            <button className="btn-secondary px-5 py-3 font-semibold" type="submit">
              Rejoindre
            </button>
          </ClientForm>
        </div>
      </section>
    );
  }

  if (context.tasks.length === 0 && canManageHousehold(context.membership.role) && params.onboarding !== "skip") {
    return (
      <div className="space-y-4">
        {dashboardMessage ? (
          <div className="app-surface rounded-[1.7rem] border border-[rgba(56,115,93,0.12)] px-4 py-3 text-sm text-[var(--leaf-600)]">
            {dashboardMessage}
          </div>
        ) : null}
        <OnboardingWizard
          householdId={context.household.id}
          householdName={context.household.name}
          currentMemberName={context.currentMember?.displayName ?? "vous"}
        />
        <div className="text-center">
          <a
            href={`/app?household=${context.household.id}&onboarding=skip`}
            className="text-xs text-[var(--ink-400)] hover:text-[var(--ink-700)]"
          >
            Passer pour l&apos;instant
          </a>
        </div>
      </div>
    );
  }

  const streak = calculateStreak(context.occurrences);
  const loadData = buildLoadMetrics(context.household.members, context.occurrences);
  const rollingData = buildRollingCompletionMetrics(context.household.members, context.occurrences);

  return (
    <div className="space-y-4">
      {dashboardMessage ? (
        <div className="app-surface rounded-[1.7rem] border border-[rgba(56,115,93,0.12)] px-4 py-3 text-sm leading-6 text-[var(--leaf-600)]">
          {dashboardMessage}
        </div>
      ) : null}

      <div className="flex justify-end">
        <StatsDrawer
          streak={streak}
          memberStats={loadData.byMember}
          rollingMetrics={rollingData}
        />
      </div>

      <TaskWorkspaceClient
        householdId={context.household.id}
        manageable={canManageHousehold(context.membership.role)}
        currentMemberId={context.currentMember?.id}
        members={context.household.members.map((member) => ({
          id: member.id,
          displayName: member.displayName,
        }))}
        occurrences={context.occurrences}
      />

      <RecentActivityFeed
        logs={context.actionLogs}
        householdId={context.household.id}
        currentMemberId={context.currentMember?.id}
      />
    </div>
  );
}
