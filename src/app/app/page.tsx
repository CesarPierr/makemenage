import dynamic from "next/dynamic";
import { startOfDay } from "date-fns";

import { ClientForm } from "@/components/shared/client-form";
import { HomeHeader } from "@/components/layout/home-header";
import { TaskWorkspaceClient } from "@/components/tasks/task-workspace-client";
import { UxEventTracker } from "@/components/shared/ux-event-tracker";
import { WeekKanban } from "@/components/tasks/week-kanban";
import { buildLoadMetrics, buildRollingCompletionMetrics, calculateStreak } from "@/lib/analytics";
import { requireUser } from "@/lib/auth";
import { canManageHousehold, getCurrentHouseholdContext } from "@/lib/households";

const OnboardingWizard = dynamic(
  () => import("@/components/onboarding/onboarding-wizard").then((m) => m.OnboardingWizard),
  { loading: () => <div className="app-surface rounded-[2rem] p-8 text-center text-ink-700 text-sm">Chargement…</div> },
);

type DashboardPageProps = {
  searchParams: Promise<{ household?: string; onboarding?: string; joined?: string; join?: string; start?: string }>;
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
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-700">
          Créez un foyer ou rejoignez-en un pour voir tout de suite ce qu&apos;il y a à faire aujourd&apos;hui.
        </p>
        {dashboardMessage ? (
          <div
            className="mt-5 rounded-[1.4rem] border px-4 py-3 text-sm leading-6 text-coral-600"
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

  const needsOnboarding = !context.currentMember?.onboardingCompletedAt && canManageHousehold(context.membership.role);

  if (needsOnboarding) {
    return (
      <div className="space-y-4">
        {dashboardMessage ? (
          <div className="app-surface rounded-[1.7rem] border border-[rgba(56,115,93,0.12)] px-4 py-3 text-sm text-leaf-600">
            {dashboardMessage}
          </div>
        ) : null}
        <OnboardingWizard
          householdId={context.household.id}
          householdName={context.household.name}
          currentMemberName={context.currentMember?.displayName ?? "vous"}
        />
      </div>
    );
  }

  const streak = calculateStreak(context.occurrences);
  const loadData = buildLoadMetrics(context.household.members, context.occurrences);
  const rollingData = buildRollingCompletionMetrics(context.household.members, context.occurrences);

  const today = startOfDay(new Date());
  const todayCount = context.occurrences.filter(
    (o) =>
      ["planned", "due", "rescheduled"].includes(o.status) &&
      startOfDay(o.scheduledDate).getTime() === today.getTime(),
  ).length;
  const overdueCount = context.occurrences.filter((o) => o.status === "overdue").length;
  const weekDone = context.weekOccurrences.filter((o) => o.status === "completed").length;
  const weekTotal = context.weekOccurrences.filter((o) => o.status !== "cancelled").length;

  const firstName = (context.currentMember?.displayName ?? user.displayName).split(" ")[0];

  return (
    <div className="space-y-4">
      <UxEventTracker
        event="home.rendered"
        props={{ todayCount, overdueCount, weekTotal, taskCount: context.tasks.length }}
      />
      {dashboardMessage ? (
        <div className="app-surface rounded-[1.7rem] border border-[rgba(56,115,93,0.12)] px-4 py-3 text-sm leading-6 text-leaf-600">
          {dashboardMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex-1">
          <HomeHeader
            firstName={firstName}
            todayCount={todayCount}
            overdueCount={overdueCount}
            weekDone={weekDone}
            weekTotal={weekTotal}
            streak={streak}
            memberStats={loadData.byMember}
            rollingMetrics={rollingData}
            householdId={context.household.id}
            recentActivity={context.actionLogs
              .filter((log) => log.actionType !== "created")
              .slice(0, 5)
              .map((log) => ({
                id: log.id,
                actionType: log.actionType,
                createdAt: log.createdAt,
                actorName: log.actorMember?.displayName ?? "Le système",
                taskTitle: log.occurrence.taskTemplate.title,
              }))}
          />
        </div>
        <div className="hidden sm:block" />
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
        autoStartSession={params.start === "session"}
      />

      <aside aria-label="Vue d'ensemble de la semaine">
        <details className="app-surface group rounded-[2rem] p-5 sm:p-6 [&[open]>summary>span.chev]:rotate-180">
          <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
            <div>
              <p className="section-kicker">Vue d&apos;ensemble</p>
              <h3 className="display-title mt-1 text-xl">Ma semaine</h3>
            </div>
            <span className="chev rounded-full border border-line bg-white/70 dark:bg-[#262830]/70 p-1.5 text-ink-500 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </summary>
          <div className="mt-4">
            <WeekKanban occurrences={context.weekOccurrences} currentMemberId={context.currentMember?.id} />
          </div>
        </details>
      </aside>

      <footer className="pb-8 pt-4 text-center">
        <a
          href={`/app/history?household=${context.household.id}`}
          className="btn-quiet px-6 py-3 text-sm font-semibold inline-flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20v-6M9 20V10M15 20V4M3 20h18" /></svg>
          Voir tout le journal d&apos;activité
        </a>
      </footer>
    </div>
  );
}
