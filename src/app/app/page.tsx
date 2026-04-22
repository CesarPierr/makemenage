import { addDays, format, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  Clock3,
  ListChecks,
  Plus,
  Settings2,
  TimerReset,
  Users,
} from "lucide-react";

import { OccurrenceCard } from "@/components/occurrence-card";
import { buildLoadMetrics, buildRollingCompletionMetrics } from "@/lib/analytics";
import { requireUser } from "@/lib/auth";
import { groupOccurrencesByRoom, sumOccurrenceMinutes } from "@/lib/experience";
import { canManageHousehold, getCurrentHouseholdContext } from "@/lib/households";
import { formatMinutes, percent } from "@/lib/utils";

type DashboardPageProps = {
  searchParams: Promise<{ household?: string; onboarding?: string; joined?: string; join?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await getCurrentHouseholdContext(user.id, params.household);

  const dashboardMessage =
    params.joined === "1"
      ? "Nouveau foyer relié au compte. Vous pouvez maintenant basculer entre vos foyers."
      : params.join === "invalid_code"
        ? "Code d’invitation introuvable ou expiré."
        : params.join === "invalid"
          ? "Lien d’invitation invalide ou expiré."
          : null;

  if (!context) {
    return (
      <section className="app-surface glow-card rounded-[2rem] p-6 sm:p-8">
        <p className="section-kicker">Bienvenue</p>
        <h2 className="display-title mt-2 text-4xl leading-tight sm:text-5xl">Créer votre premier foyer</h2>
        {dashboardMessage ? (
          <div className="mt-5 rounded-[1.4rem] border px-4 py-3 text-sm leading-6 text-[var(--coral-600)]" style={{ backgroundColor: "rgba(216, 100, 61, 0.12)", borderColor: "rgba(30, 31, 34, 0.06)" }}>
            {dashboardMessage}
          </div>
        ) : null}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="soft-panel p-4">
            <h3 className="text-lg font-semibold">Nouveau foyer</h3>
            <form action="/api/households" method="post" className="mt-4 compact-form-grid">
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
            </form>
          </div>

          <div className="soft-panel p-4">
            <h3 className="text-lg font-semibold">Rejoindre</h3>
            <form action="/api/invitations/redeem" method="post" className="mt-4 compact-form-grid">
              <label className="field-label">
                <span>Code</span>
                <input className="field" type="text" name="code" placeholder="Code d’invitation" required />
              </label>
              <button className="btn-secondary px-5 py-3 font-semibold" type="submit">
                Rejoindre
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  const manageable = canManageHousehold(context.membership.role);
  const today = startOfToday();
  const todaysOccurrences = context.occurrences.filter(
    (occurrence) => format(occurrence.scheduledDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"),
  );
  const upcomingOccurrences = context.occurrences.filter(
    (occurrence) =>
      occurrence.scheduledDate > today &&
      occurrence.scheduledDate <= addDays(today, 7) &&
      occurrence.status !== "cancelled",
  );
  const myOccurrences = context.currentMember
    ? context.occurrences.filter((occurrence) => occurrence.assignedMemberId === context.currentMember?.id)
    : [];
  const metrics = buildLoadMetrics(context.household.members, context.weekOccurrences);
  const rollingCompletionMetrics = buildRollingCompletionMetrics(context.household.members, context.occurrences);
  const todaysByRoom = groupOccurrencesByRoom(todaysOccurrences);
  const upcomingByRoom = groupOccurrencesByRoom(upcomingOccurrences);
  const weekCompletedCount = context.weekOccurrences.filter((occurrence) => occurrence.status === "completed").length;
  const weekCompletionRate = context.weekOccurrences.length
    ? Math.round((weekCompletedCount / context.weekOccurrences.length) * 100)
    : 0;
  const todayMinutes = sumOccurrenceMinutes(todaysOccurrences);
  const upcomingMinutes = sumOccurrenceMinutes(upcomingOccurrences);
  const quickActions = [
    {
      href: `/app/my-tasks?household=${context.household.id}&tab=daily`,
      label: "Voir mes tâches",
      detail: "Priorités, corrections et tâches à venir",
      icon: ListChecks,
    },
    {
      href: `/app/calendar?household=${context.household.id}`,
      label: "Ouvrir le calendrier",
      detail: "Vue mensuelle et export iCal",
      icon: CalendarDays,
    },
    {
      href: `/app/settings?household=${context.household.id}${manageable ? "&panel=team" : ""}`,
      label: manageable ? "Gérer le foyer" : "Voir mes réglages",
      detail: manageable ? "Membres, accès et intégrations" : "Profil et préférences",
      icon: manageable ? Users : Settings2,
    },
    ...(manageable
      ? [
          {
            href: `/app/my-tasks?household=${context.household.id}&tab=wizard`,
            label: "Créer une tâche",
            detail: "Simple ou récurrente, en quelques étapes",
            icon: Plus,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {dashboardMessage ? (
        <div className="app-surface rounded-[1.7rem] border border-[rgba(56,115,93,0.12)] px-4 py-3 text-sm leading-6 text-[var(--leaf-600)]">
          {dashboardMessage}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="app-surface glow-card interactive-surface rounded-[2rem] p-5 sm:p-6">
          <p className="section-kicker">
            {format(today, "EEEE d MMMM", { locale: fr })}
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="display-title text-3xl leading-tight sm:text-4xl">
                Vue rapide du foyer {context.household.name}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-700)] sm:text-[0.98rem]">
                Une entrée plus directe pour voir quoi faire, où agir et comment garder le foyer fluide.
              </p>
            </div>
            <span className="accent-pill">
              <span className="accent-pill-dot" style={{ backgroundColor: "var(--leaf-500)" }} />
              {weekCompletionRate}% validé cette semaine
            </span>
          </div>

          <div className="mt-6 summary-strip sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Aujourd’hui",
                value: todaysOccurrences.length.toString(),
                detail: `${formatMinutes(todayMinutes)} prévues`,
                icon: ListChecks,
              },
              {
                label: "En retard",
                value: context.overdueOccurrences.filter((occurrence) => occurrence.status === "overdue").length.toString(),
                detail: "à rattraper",
                icon: TimerReset,
              },
              {
                label: "Cette semaine",
                value: context.weekOccurrences.length.toString(),
                detail: "occurrences",
                icon: CalendarClock,
              },
              {
                label: "Ma charge",
                value: context.currentMember
                  ? formatMinutes(
                      myOccurrences.reduce(
                        (sum, occurrence) => sum + occurrence.taskTemplate.estimatedMinutes,
                        0,
                      ),
                    )
                  : "0 min",
                detail: "sur la période",
                icon: Clock3,
              },
            ].map(({ label, value, detail, icon: Icon }) => (
              <article key={label} className="metric-card interactive-surface px-4 py-4">
                <Icon className="size-5 text-[var(--coral-600)]" />
                <p className="mt-3 text-sm text-[var(--ink-700)]">{label}</p>
                <p className="mt-1 text-3xl font-semibold">{value}</p>
                <p className="text-sm text-[var(--ink-500)]">{detail}</p>
              </article>
            ))}
          </div>

          <div className="soft-divider my-6" />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map(({ href, label, detail, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="metric-card interactive-surface flex min-h-[8.8rem] flex-col justify-between px-4 py-4 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-strong)]"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-[rgba(47,109,136,0.12)] text-[var(--sky-600)]">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1.5">
                  <p className="font-semibold text-[var(--ink-950)]">{label}</p>
                  <p className="text-sm leading-6 text-[var(--ink-700)]">{detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="app-surface rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Rythme</p>
              <h3 className="display-title mt-2 text-3xl">Charge de la semaine</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">
                Répartition actuelle et niveau de validation sur la fenêtre active.
              </p>
            </div>
            <Link className="btn-secondary px-4 py-2 text-sm" href={`/app/settings?household=${context.household.id}`}>
              Régler
            </Link>
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-[var(--line)] bg-white/70 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--ink-950)]">Progression collective</p>
                <p className="text-sm text-[var(--ink-700)]">
                  {weekCompletedCount} tâche{weekCompletedCount > 1 ? "s" : ""} validée{weekCompletedCount > 1 ? "s" : ""} sur {context.weekOccurrences.length}
                </p>
              </div>
              <span className="text-sm font-semibold text-[var(--leaf-600)]">{weekCompletionRate}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/6">
              <div
                className="h-full rounded-full bg-[var(--leaf-500)] transition-all"
                style={{ width: `${weekCompletionRate}%` }}
              />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {metrics.byMember.map((member) => (
              <div key={member.memberId} className="soft-panel interactive-surface px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    <div>
                      <p className="font-semibold">{member.displayName}</p>
                      <p className="text-sm text-[var(--ink-700)]">
                        {member.plannedCount} tâches, {formatMinutes(member.plannedMinutes)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[var(--leaf-600)]">
                    {percent(member.completionRate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div
          className="app-surface deferred-section rounded-[2rem] p-4 sm:p-5"
          style={{ background: "linear-gradient(180deg, rgba(63,127,103,0.08), rgba(255,255,255,0.96))" }}
        >
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="section-kicker">Focus</p>
              <h3 className="display-title mt-2 text-2xl">Aujourd’hui</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="accent-pill">
                <span className="accent-pill-dot" style={{ backgroundColor: "var(--leaf-500)" }} />
                {todaysOccurrences.length} prévue{todaysOccurrences.length > 1 ? "s" : ""}
              </span>
              <span className="accent-pill">
                <span className="accent-pill-dot" style={{ backgroundColor: "var(--coral-500)" }} />
                {formatMinutes(todayMinutes)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <p className="text-sm text-[var(--ink-700)]">
              Regroupé par pièce pour faciliter les séquences de ménage et éviter les allers-retours.
            </p>
            <Link className="text-sm font-semibold text-[var(--coral-600)]" href={`/app/my-tasks?household=${context.household.id}&tab=daily`}>
              Voir mes tâches
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {todaysByRoom.length ? (
              todaysByRoom.map(({ room, occurrences, totalMinutes }) => (
                <div key={room} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <span className="stat-pill px-3 py-1 text-xs font-semibold">{room}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
                        {occurrences.length} tâche{occurrences.length > 1 ? "s" : ""}
                      </span>
                      <span className="stat-pill px-3 py-1 text-xs font-semibold">{formatMinutes(totalMinutes)}</span>
                    </div>
                  </div>
                  {occurrences.map((occurrence) => (
                    <OccurrenceCard
                      key={occurrence.id}
                      occurrence={occurrence}
                      members={context.household.members}
                      currentMemberId={context.currentMember?.id}
                    />
                  ))}
                </div>
              ))
            ) : (
              <div className="rounded-[1.8rem] border border-[var(--line)] bg-white/80 p-5 text-[var(--ink-700)]">
                Aucune tâche prévue aujourd&apos;hui.
              </div>
            )}
          </div>
        </div>

        <div
          className="app-surface deferred-section rounded-[2rem] p-4 sm:p-5"
          style={{ background: "linear-gradient(180deg, rgba(47,109,136,0.08), rgba(255,255,255,0.96))" }}
        >
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="section-kicker">Planning</p>
              <h3 className="display-title mt-2 text-2xl">À venir</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="accent-pill">
                <span className="accent-pill-dot" style={{ backgroundColor: "var(--sky-500)" }} />
                {upcomingOccurrences.length} occurrence{upcomingOccurrences.length > 1 ? "s" : ""}
              </span>
              <span className="accent-pill">
                <span className="accent-pill-dot" style={{ backgroundColor: "var(--leaf-500)" }} />
                {formatMinutes(upcomingMinutes)}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <p className="text-sm text-[var(--ink-700)]">
              Les prochaines occurrences pour organiser les journées suivantes sans perdre le fil.
            </p>
            <Link className="text-sm font-semibold text-[var(--coral-600)]" href={`/app/calendar?household=${context.household.id}`}>
              Voir le calendrier
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {upcomingByRoom.length ? (
              upcomingByRoom.map(({ room, occurrences, totalMinutes }) => (
                <div key={room} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <span className="stat-pill px-3 py-1 text-xs font-semibold">{room}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
                        {occurrences.length} tâche{occurrences.length > 1 ? "s" : ""}
                      </span>
                      <span className="stat-pill px-3 py-1 text-xs font-semibold">{formatMinutes(totalMinutes)}</span>
                    </div>
                  </div>
                  {occurrences.slice(0, 4).map((occurrence) => (
                    <OccurrenceCard
                      key={occurrence.id}
                      occurrence={occurrence}
                      members={context.household.members}
                      currentMemberId={context.currentMember?.id}
                      compact
                    />
                  ))}
                </div>
              ))
            ) : (
              <div className="rounded-[1.8rem] border border-[var(--line)] bg-white/80 p-5 text-[var(--ink-700)]">
                Rien d&apos;urgent dans les 7 prochains jours.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {rollingCompletionMetrics.map((windowMetrics) => (
          <article key={windowMetrics.days} className="app-surface rounded-[2rem] p-5 sm:p-6">
            <p className="section-kicker">Statistiques glissantes</p>
            <h3 className="display-title mt-2 text-3xl">
              {windowMetrics.days === 7 ? "7 derniers jours" : "30 derniers jours"}
            </h3>
            <div className="mt-5 space-y-3">
              {windowMetrics.byMember.map((member) => (
                <div key={`${windowMetrics.days}-${member.memberId}`} className="soft-panel px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="size-3 rounded-full" style={{ backgroundColor: member.color }} />
                      <div>
                        <p className="font-semibold">{member.displayName}</p>
                        <p className="text-sm text-[var(--ink-700)]">
                          {member.completedCount} tâche{member.completedCount > 1 ? "s" : ""} validée{member.completedCount > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[var(--leaf-600)]">
                      {formatMinutes(member.minutesSpent)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

    </div>
  );
}
