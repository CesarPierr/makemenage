import { addDays, format, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { ArrowRight, CalendarClock, Clock3, ListChecks, Settings2, TimerReset } from "lucide-react";

import { OccurrenceCard } from "@/components/occurrence-card";
import { buildLoadMetrics, buildRollingCompletionMetrics } from "@/lib/analytics";
import { requireUser } from "@/lib/auth";
import { getCurrentHouseholdContext } from "@/lib/households";
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
  const todaysByRoom = Object.entries(
    todaysOccurrences.reduce<Record<string, typeof todaysOccurrences>>((groups, occurrence) => {
      const room = occurrence.taskTemplate.room || "Tout l'appartement";
      groups[room] = [...(groups[room] ?? []), occurrence];
      return groups;
    }, {}),
  );
  const upcomingByRoom = Object.entries(
    upcomingOccurrences.reduce<Record<string, typeof upcomingOccurrences>>((groups, occurrence) => {
      const room = occurrence.taskTemplate.room || "Tout l'appartement";
      groups[room] = [...(groups[room] ?? []), occurrence];
      return groups;
    }, {}),
  );

  return (
    <div className="space-y-4">
      {dashboardMessage ? (
        <div className="app-surface rounded-[1.7rem] border border-[rgba(56,115,93,0.12)] px-4 py-3 text-sm leading-6 text-[var(--leaf-600)]">
          {dashboardMessage}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
          <p className="section-kicker">
            {format(today, "EEEE d MMMM", { locale: fr })}
          </p>
          <h2 className="display-title mt-2 text-3xl leading-tight sm:text-4xl">
            Vue rapide du foyer {context.household.name}
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
              href={`/app/my-tasks?household=${context.household.id}`}
            >
              Ouvrir les tâches
              <ArrowRight className="size-4" />
            </Link>
            <Link
              className="btn-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
              href={`/app/calendar?household=${context.household.id}`}
            >
              Voir le calendrier
            </Link>
            <Link
              className="btn-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
              href={`/app/settings?household=${context.household.id}`}
            >
              <Settings2 className="size-4" />
              Réglages
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Aujourd’hui",
                value: todaysOccurrences.length.toString(),
                detail: "tâches prévues",
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
              <article key={label} className="soft-panel px-4 py-4">
                <Icon className="size-5 text-[var(--coral-600)]" />
                <p className="mt-3 text-sm text-[var(--ink-700)]">{label}</p>
                <p className="mt-1 text-3xl font-semibold">{value}</p>
                <p className="text-sm text-[var(--ink-500)]">{detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="app-surface rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Équilibre</p>
              <h3 className="display-title mt-2 text-3xl">Charge de la semaine</h3>
            </div>
            <Link className="btn-secondary px-4 py-2 text-sm" href={`/app/settings?household=${context.household.id}`}>
              Régler
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {metrics.byMember.map((member) => (
              <div key={member.memberId} className="soft-panel px-4 py-4">
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
          className="app-surface rounded-[2rem] p-4 sm:p-5"
          style={{ background: "linear-gradient(180deg, rgba(63,127,103,0.08), rgba(255,255,255,0.96))" }}
        >
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="section-kicker">Focus</p>
              <h3 className="display-title mt-2 text-2xl">Aujourd’hui</h3>
            </div>
            <Link className="text-sm font-semibold text-[var(--coral-600)]" href={`/app/my-tasks?household=${context.household.id}`}>
              Voir mes tâches
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {todaysByRoom.length ? (
              todaysByRoom.map(([room, occurrences]) => (
                <div key={room} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <span className="stat-pill px-3 py-1 text-xs font-semibold">{room}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
                      {occurrences.length} tâche{occurrences.length > 1 ? "s" : ""}
                    </span>
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
          className="app-surface rounded-[2rem] p-4 sm:p-5"
          style={{ background: "linear-gradient(180deg, rgba(47,109,136,0.08), rgba(255,255,255,0.96))" }}
        >
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="section-kicker">Planning</p>
              <h3 className="display-title mt-2 text-2xl">À venir</h3>
            </div>
            <Link className="text-sm font-semibold text-[var(--coral-600)]" href={`/app/calendar?household=${context.household.id}`}>
              Voir le calendrier
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {upcomingByRoom.length ? (
              upcomingByRoom.map(([room, occurrences]) => (
                <div key={room} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <span className="stat-pill px-3 py-1 text-xs font-semibold">{room}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
                      {occurrences.length} tâche{occurrences.length > 1 ? "s" : ""}
                    </span>
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
