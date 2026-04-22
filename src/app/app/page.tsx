import { addDays, format, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { ArrowRight, CalendarClock, Clock3, ListChecks, Settings2, TimerReset } from "lucide-react";

import { OccurrenceCard } from "@/components/occurrence-card";
import { buildLoadMetrics, buildRollingCompletionMetrics } from "@/lib/analytics";
import { requireUser } from "@/lib/auth";
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
        <h2 className="display-title mt-2 text-4xl leading-tight sm:text-5xl">
          Créer votre premier foyer
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--ink-700)]">
          On démarre en une minute : le foyer, les membres, puis les tâches récurrentes. Tout est pensé pour se faire depuis le téléphone.
        </p>
        {dashboardMessage ? (
          <div className="mt-5 rounded-[1.4rem] border px-4 py-3 text-sm leading-6 text-[var(--coral-600)]" style={{ backgroundColor: "rgba(216, 100, 61, 0.12)", borderColor: "rgba(30, 31, 34, 0.06)" }}>
            {dashboardMessage}
          </div>
        ) : null}
        <div className="mt-6 mobile-section-grid sm:max-w-2xl sm:grid-cols-3">
          {[
            "Un seul foyer pour commencer, sans configuration lourde.",
            "Ajout rapide des membres et de leurs couleurs.",
            "Première tâche prête à tourner juste après.",
          ].map((tip) => (
            <div key={tip} className="soft-panel px-4 py-3 text-sm leading-6 text-[var(--ink-700)]">
              {tip}
            </div>
          ))}
        </div>
        <form action="/api/households" method="post" className="mt-8 grid gap-3 sm:max-w-lg">
          <input className="field" type="text" name="name" placeholder="Nom du foyer" required />
          <input
            className="field"
            type="text"
            name="timezone"
            defaultValue={process.env.DEFAULT_TIMEZONE ?? "Europe/Paris"}
            required
          />
          <button className="btn-primary px-5 py-3 font-semibold" type="submit">
            Créer le foyer
          </button>
        </form>
        <div className="mt-8 max-w-lg rounded-[1.8rem] border border-[rgba(30,31,34,0.08)] bg-white/70 p-4">
          <p className="text-sm font-semibold text-[var(--ink-950)]">Ou rejoindre un foyer existant</p>
          <p className="mt-1 text-sm leading-6 text-[var(--ink-700)]">
            Collez simplement le code d’invitation qu’un proche vous a partagé.
          </p>
          <form action="/api/invitations/redeem" method="post" className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className="field" type="text" name="code" placeholder="Code d’invitation" required />
            <button className="btn-secondary px-5 py-3 font-semibold" type="submit">
              Rejoindre
            </button>
          </form>
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
          <p className="mt-3 max-w-2xl text-[var(--ink-700)]">
            Les actions les plus fréquentes sont juste en dessous. L&apos;objectif est qu&apos;un passage de 20 secondes sur téléphone suffise à garder le planning net.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
              href={`/app/my-tasks?household=${context.household.id}`}
            >
              Mes tâches
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
          <div className="mt-6 mobile-section-grid sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="display-title text-2xl">Aujourd’hui</h3>
            <Link className="text-sm font-semibold text-[var(--coral-600)]" href={`/app/my-tasks?household=${context.household.id}`}>
              Voir mes tâches
            </Link>
          </div>
          {todaysOccurrences.length ? (
            todaysOccurrences.map((occurrence) => (
              <OccurrenceCard
                key={occurrence.id}
                occurrence={occurrence}
                members={context.household.members}
                currentMemberId={context.currentMember?.id}
              />
            ))
          ) : (
            <div className="app-surface rounded-[1.8rem] p-5 text-[var(--ink-700)]">
              Aucune tâche prévue aujourd&apos;hui.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="display-title text-2xl">À venir</h3>
            <Link className="text-sm font-semibold text-[var(--coral-600)]" href={`/app/calendar?household=${context.household.id}`}>
              Voir le calendrier
            </Link>
          </div>
          {upcomingOccurrences.length ? (
            upcomingOccurrences.slice(0, 6).map((occurrence) => (
              <OccurrenceCard
                key={occurrence.id}
                occurrence={occurrence}
                members={context.household.members}
                currentMemberId={context.currentMember?.id}
                compact
              />
            ))
          ) : (
            <div className="app-surface rounded-[1.8rem] p-5 text-[var(--ink-700)]">
              Rien d&apos;urgent dans les 7 prochains jours.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {rollingCompletionMetrics.map((windowMetrics) => (
          <article key={windowMetrics.days} className="app-surface rounded-[2rem] p-5 sm:p-6">
            <p className="section-kicker">Statistiques glissantes</p>
            <h3 className="display-title mt-2 text-3xl">
              {windowMetrics.days === 7 ? "7 derniers jours" : "30 derniers jours"}
            </h3>
            <p className="mt-2 text-sm text-[var(--ink-700)]">
              Nombre de tâches réellement validées et temps passé déclaré par personne.
            </p>
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

      {canManageHousehold(context.membership.role) ? (
        <section className="app-surface rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker">Ajout rapide</p>
              <h3 className="display-title mt-2 text-3xl">Créer une nouvelle tâche</h3>
            </div>
            <p className="max-w-xl text-sm text-[var(--ink-700)]">
              Utilisez le mode d&apos;attribution qui correspond à la vie réelle: fixe, alternance, round-robin ou équilibrage.
            </p>
          </div>

          <form action="/api/tasks" method="post" className="mt-6 grid gap-3 lg:grid-cols-2">
            <input type="hidden" name="householdId" value={context.household.id} />
            <input className="field" type="text" name="title" placeholder="Titre de la tâche" required />
            <input className="field" type="number" min="5" name="estimatedMinutes" placeholder="Durée estimée (min)" required />
            <input className="field" type="text" name="category" placeholder="Catégorie" />
            <input className="field" type="text" name="room" placeholder="Pièce" />
            <input className="field" type="date" name="startsOn" required />
            <select className="field" name="recurrenceType" defaultValue="weekly">
              <option value="daily">Tous les jours</option>
              <option value="every_x_days">Tous les X jours</option>
              <option value="weekly">Chaque semaine</option>
              <option value="every_x_weeks">Toutes les X semaines</option>
              <option value="monthly_simple">Chaque mois</option>
            </select>
            <input className="field" type="number" min="1" name="interval" defaultValue="1" required />
            <select className="field" name="assignmentMode" defaultValue="strict_alternation">
              <option value="fixed">Fixe</option>
              <option value="manual">Manuelle</option>
              <option value="strict_alternation">Alternance stricte</option>
              <option value="round_robin">Round-robin</option>
              <option value="least_assigned_count">Moins de tâches</option>
              <option value="least_assigned_minutes">Moins de minutes</option>
            </select>
            <div className="soft-panel p-3 lg:col-span-2">
              <p className="text-sm font-semibold text-[var(--ink-950)]">Membres concernés</p>
              <p className="mt-1 text-sm text-[var(--ink-700)]">
                Sélection multiple. Sur mobile, gardez appuyé pour choisir plusieurs personnes si besoin.
              </p>
              <select className="field mt-3" name="eligibleMemberIds" multiple required size={Math.min(context.household.members.length, 5)}>
                {context.household.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary lg:col-span-2 px-5 py-3 font-semibold" type="submit">
              Créer la tâche
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
