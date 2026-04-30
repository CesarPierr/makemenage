import { addDays, format, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { Activity, CalendarDays, ChevronRight, ClipboardList, Clock3, Plus, RefreshCcw, ShieldAlert, Users, Wrench } from "lucide-react";

import { PlanifierHubCard } from "@/components/dashboard/planifier-hub-card";
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
    <section className="relative space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header - Clean & Integrated */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h2 className="display-title text-3xl leading-tight sm:text-4xl">Garder le cap</h2>
          <p className="mt-1 text-sm font-medium text-ink-500">
            Calendrier, routines et organisation du foyer
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link 
            href={`/app/calendar${householdParam}`}
            className="accent-pill hover:scale-105 active:scale-95 transition-all shadow-sm bg-white dark:bg-[#262830]"
          >
            <span className="accent-pill-dot" style={{ backgroundColor: "var(--sky-500)" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{upcomingOccurrences.length} à venir</span>
          </Link>
          <Link 
            href={`/app/my-tasks?household=${context.household.id}&tab=templates`}
            className="accent-pill hover:scale-105 active:scale-95 transition-all shadow-sm bg-white dark:bg-[#262830]"
          >
            <span className="accent-pill-dot" style={{ backgroundColor: "var(--leaf-500)" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{context.tasks.length} routines</span>
          </Link>
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
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(47,109,136,0.12)] text-sky-600">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-950">{label}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-700">{detail}</p>
                </div>
                <span className="text-sm font-bold text-sky-600">Ouvrir</span>
              </Link>
            ))}
          </div>
        </article>

        <article className="app-surface rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">À surveiller</p>
              <h3 className="display-title mt-2 text-3xl">Monitoring du foyer</h3>
            </div>
            <Clock3 className="size-5 text-coral-600" />
          </div>

          <div className="mt-5 space-y-3">
            {absences[0] ? (
              <Link 
                href={`/app/settings/planning${householdParam}`}
                className="soft-panel interactive-surface block px-4 py-4 transition-all hover:shadow-md"
              >
                <p className="text-sm font-semibold text-ink-950">Absence la plus proche</p>
                <p className="mt-2 text-lg font-semibold text-leaf-600">{absences[0].member.displayName}</p>
                <p className="mt-1 text-sm text-ink-700">
                  Du {format(absences[0].startDate, "d MMM", { locale: fr })} au {format(absences[0].endDate, "d MMM", { locale: fr })}
                </p>
                {absences[0].notes ? (
                  <p className="mt-2 text-sm text-ink-700 italic">{absences[0].notes}</p>
                ) : null}
              </Link>
            ) : null}

            {activeOverrides.length ? (
              <Link 
                href={`/app/calendar${householdParam}&modified=1`}
                className="soft-panel interactive-surface flex items-center gap-4 px-4 py-4 transition-all hover:shadow-md border-l-4 border-coral-500"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--coral-50)] text-coral-600">
                  <Wrench className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-950">Changements manuels actifs</p>
                  <p className="mt-1 text-lg font-semibold text-coral-600">{activeOverrides.length} occurrence{activeOverrides.length > 1 ? "s" : ""}</p>
                </div>
                <ChevronRight className="size-5 text-[var(--ink-300)]" />
              </Link>
            ) : null}

            {!absences[0] && activeOverrides.length === 0 ? (
              <div className="rounded-[1.4rem] border border-line bg-white/70 dark:bg-[#262830]/70 px-4 py-4 text-sm leading-6 text-ink-700">
                Rien de sensible à ajuster pour le moment. Vous pouvez simplement consulter le calendrier ou laisser le foyer suivre son rythme.
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
