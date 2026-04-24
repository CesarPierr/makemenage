import { addDays, format, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { Activity, CalendarDays, ClipboardList, Clock3, Plus, RefreshCcw, ShieldAlert, Users } from "lucide-react";

import { PlanifierHubCard } from "@/components/planifier-hub-card";
import { requireUser } from "@/lib/auth";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";

type PlanifierPageProps = {
  searchParams: Promise<{ household?: string }>;
};

function buildAbsences(context: Awaited<ReturnType<typeof requireHouseholdContext>>) {
  const today = startOfToday();

  return context.household.members
    .flatMap((member) =>
      member.availabilities
        .filter((availability) => availability.type === "date_range_absence")
        .map((availability) => ({
          id: availability.id,
          startDate: availability.startDate,
          endDate: availability.endDate,
          notes: availability.notes,
          member: {
            displayName: member.displayName,
            color: member.color,
          },
        })),
    )
    .filter((absence) => absence.endDate >= today)
    .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
}

export default async function PlanifierPage({ searchParams }: PlanifierPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);
  const manageable = canManageHousehold(context.membership.role);
  const today = startOfToday();
  const nextTwoWeeks = addDays(today, 14);
  const householdParam = `?household=${context.household.id}`;

  const upcomingOccurrences = context.occurrences.filter(
    (occurrence) =>
      occurrence.status !== "cancelled" &&
      occurrence.scheduledDate >= today &&
      occurrence.scheduledDate <= nextTwoWeeks,
  );
  const absences = buildAbsences(context);
  const activeOverrides = context.occurrences.filter(
    (occurrence) =>
      occurrence.isManuallyModified &&
      occurrence.scheduledDate >= today &&
      !["completed", "skipped", "cancelled"].includes(occurrence.status),
  );
  const recentActions = context.actionLogs.filter((log) => log.actionType !== "created");

  const quickStarts = manageable
    ? [
        {
          href: `/app/my-tasks?household=${context.household.id}&tab=templates`,
          label: "Bibliothèque de tâches",
          detail: "Retrouver une routine, l'ajuster ou l'archiver.",
          icon: ClipboardList,
        },
        {
          href: `/app/settings/planning${householdParam}`,
          label: "Absences et répartition",
          detail: "Ajouter une absence ou relancer un recalcul propre.",
          icon: RefreshCcw,
        },
        {
          href: `/app/my-tasks?household=${context.household.id}&tab=wizard`,
          label: "Ajouter une tâche",
          detail: "Créer une nouvelle routine sans repasser par tout le catalogue.",
          icon: Plus,
        },
      ]
    : [
        {
          href: `/app/calendar${householdParam}`,
          label: "Voir la suite",
          detail: "Regarder les prochains jours et les pièces à venir.",
          icon: CalendarDays,
        },
        {
          href: `/app/history${householdParam}`,
          label: "Voir l'activité",
          detail: "Comprendre ce qui a été fait ou déplacé récemment.",
          icon: Activity,
        },
        {
          href: `/app/settings/team${householdParam}`,
          label: "Mon foyer",
          detail: "Retrouver l'équipe et les infos utiles du foyer.",
          icon: Users,
        },
      ];

  return (
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-kicker">Planifier</p>
            <h2 className="display-title mt-2 text-4xl leading-tight sm:text-5xl">Tout ce qui aide à garder le cap</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-700)] sm:text-[0.98rem]">
              Le quotidien reste dans <strong>Aujourd&apos;hui</strong>. Ici, vous regardez plus loin, ajustez les routines
              et vérifiez ce qui peut faire bouger le planning.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="accent-pill">
              <span className="accent-pill-dot" style={{ backgroundColor: "var(--sky-500)" }} />
              {upcomingOccurrences.length} tâche{upcomingOccurrences.length > 1 ? "s" : ""} sur 14 jours
            </span>
            <span className="accent-pill">
              <span className="accent-pill-dot" style={{ backgroundColor: "var(--leaf-500)" }} />
              {context.tasks.length} routine{context.tasks.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="mt-6 summary-strip sm:grid-cols-2 xl:grid-cols-4">
          <article className="metric-card interactive-surface px-4 py-4">
            <p className="text-sm text-[var(--ink-700)]">Deux prochaines semaines</p>
            <p className="mt-2 text-3xl font-semibold">{upcomingOccurrences.length}</p>
            <p className="text-sm text-[var(--ink-500)]">
              du {format(today, "d MMM", { locale: fr })} au {format(nextTwoWeeks, "d MMM", { locale: fr })}
            </p>
          </article>
          <article className="metric-card interactive-surface px-4 py-4">
            <p className="text-sm text-[var(--ink-700)]">Absences à venir</p>
            <p className="mt-2 text-3xl font-semibold">{absences.length}</p>
            <p className="text-sm text-[var(--ink-500)]">à prendre en compte</p>
          </article>
          <article className="metric-card interactive-surface px-4 py-4">
            <p className="text-sm text-[var(--ink-700)]">Modifs à surveiller</p>
            <p className="mt-2 text-3xl font-semibold">{activeOverrides.length}</p>
            <p className="text-sm text-[var(--ink-500)]">changements manuels actifs</p>
          </article>
          <article className="metric-card interactive-surface px-4 py-4">
            <p className="text-sm text-[var(--ink-700)]">Activité récente</p>
            <p className="mt-2 text-3xl font-semibold">{recentActions.length}</p>
            <p className="text-sm text-[var(--ink-500)]">actions à relire si besoin</p>
          </article>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PlanifierHubCard
          href={`/app/calendar${householdParam}`}
          icon={CalendarDays}
          label="Calendrier"
          description="Voir les jours chargés, les absences et la suite sans quitter le rythme du foyer."
          value={upcomingOccurrences.length.toString()}
          detail="tâches prévues sur 14 jours"
          cta="Ouvrir"
          accent="sky"
        />

        <PlanifierHubCard
          href={`/app/history${householdParam}`}
          icon={Activity}
          label="Activité"
          description="Relire ce qui a été fait, déplacé ou corrigé quand il faut comprendre ce qui a changé."
          value={recentActions.length.toString()}
          detail="actions utiles récentes"
          cta="Voir"
          accent="leaf"
        />

        {manageable ? (
          <PlanifierHubCard
            href={`/app/my-tasks?household=${context.household.id}&tab=templates`}
            icon={ClipboardList}
            label="Bibliothèque de tâches"
            description="Retrouver toutes les routines du foyer, les corriger et garder un catalogue propre."
            value={context.tasks.length.toString()}
            detail={`routine active${context.tasks.length > 1 ? "s" : ""}`}
            cta="Gérer"
            accent="coral"
          />
        ) : null}

        {manageable ? (
          <PlanifierHubCard
            href={`/app/settings/planning${householdParam}`}
            icon={ShieldAlert}
            label="Absences et répartition"
            description="Ajouter une indisponibilité, vérifier les impacts et relancer un recalcul si nécessaire."
            value={absences.length.toString()}
            detail={`absence${absences.length > 1 ? "s" : ""} à venir`}
            cta="Ajuster"
            accent="ink"
          />
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="app-surface rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Par où commencer</p>
              <h3 className="display-title mt-2 text-3xl">Trois raccourcis utiles</h3>
            </div>
            <span className="stat-pill px-3 py-1 text-xs font-semibold">simple et direct</span>
          </div>

          <div className="mt-5 space-y-3">
            {quickStarts.map(({ href, label, detail, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="soft-panel interactive-surface flex items-center gap-4 px-4 py-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(47,109,136,0.12)] text-[var(--sky-600)]">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--ink-950)]">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-700)]">{detail}</p>
                </div>
                <span className="text-sm font-bold text-[var(--sky-600)]">Ouvrir</span>
              </Link>
            ))}
          </div>
        </article>

        <article className="app-surface rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">À surveiller</p>
              <h3 className="display-title mt-2 text-3xl">Le prochain point d&apos;attention</h3>
            </div>
            <Clock3 className="size-5 text-[var(--coral-600)]" />
          </div>

          <div className="mt-5 space-y-3">
            {absences[0] ? (
              <div className="soft-panel px-4 py-4">
                <p className="text-sm font-semibold text-[var(--ink-950)]">Absence la plus proche</p>
                <p className="mt-2 text-lg font-semibold">{absences[0].member.displayName}</p>
                <p className="mt-1 text-sm text-[var(--ink-700)]">
                  Du {format(absences[0].startDate, "d MMM", { locale: fr })} au {format(absences[0].endDate, "d MMM", { locale: fr })}
                </p>
                {absences[0].notes ? (
                  <p className="mt-2 text-sm text-[var(--ink-700)]">{absences[0].notes}</p>
                ) : null}
              </div>
            ) : null}

            {activeOverrides.length ? (
              <div className="soft-panel px-4 py-4">
                <p className="text-sm font-semibold text-[var(--ink-950)]">Changements manuels actifs</p>
                <p className="mt-2 text-lg font-semibold">{activeOverrides.length} occurrence{activeOverrides.length > 1 ? "s" : ""}</p>
                <p className="mt-1 text-sm text-[var(--ink-700)]">
                  Pensez à vérifier ces décalages avant un gros recalcul.
                </p>
              </div>
            ) : null}

            {!absences[0] && activeOverrides.length === 0 ? (
              <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 px-4 py-4 text-sm leading-6 text-[var(--ink-700)]">
                Rien de sensible à ajuster pour le moment. Vous pouvez simplement consulter le calendrier ou laisser le foyer suivre son rythme.
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
