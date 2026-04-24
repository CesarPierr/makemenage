import { requireUser } from "@/lib/auth";
import { requireHouseholdContext, canManageHousehold } from "@/lib/households";
import { redirect } from "next/navigation";
import { ClientForm } from "@/components/client-form";

type PlanningPageProps = {
  searchParams: Promise<{ household?: string; rebalance?: string; absence?: string }>;
};

export default async function PlanningSettingsPage({ searchParams }: PlanningPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);
  const manageable = canManageHousehold(context.membership.role);

  if (!manageable) redirect(`/app/settings?household=${context.household.id}`);

  const upcomingAbsences = context.household.members
    .flatMap((member) =>
      member.availabilities
        .filter((a) => a.type === "date_range_absence")
        .map((a) => ({
          id: a.id,
          startDate: a.startDate,
          endDate: a.endDate,
          notes: a.notes,
          member: { id: member.id, displayName: member.displayName, color: member.color },
        })),
    )
    .filter((a) => a.endDate >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const feedbackMessage =
    params.rebalance === "done"
      ? { tone: "success" as const, text: "Rééquilibrage terminé." }
      : params.rebalance === "done_overwrite"
        ? { tone: "success" as const, text: "Rééquilibrage terminé avec écrasement des modifications futures." }
        : params.absence === "saved"
          ? { tone: "success" as const, text: "Absence enregistrée et planning réajusté." }
          : params.absence === "removed"
            ? { tone: "success" as const, text: "Absence annulée et planning recalculé." }
            : params.absence === "invalid"
              ? { tone: "error" as const, text: "Impossible d'enregistrer cette absence." }
              : params.absence === "forbidden"
                ? { tone: "error" as const, text: "Vous ne pouvez pas modifier cette absence." }
                : null;

  return (
    <section className="app-surface rounded-[2rem] p-5 sm:p-6 space-y-5">
      <div>
        <p className="section-kicker">Planning</p>
        <h3 className="display-title mt-2 text-3xl">Gestion des absences</h3>
      </div>

      {feedbackMessage ? (
        <div
          className="rounded-[1.4rem] border px-4 py-3 text-sm leading-6"
          style={{
            backgroundColor: feedbackMessage.tone === "success" ? "rgba(56,115,93,0.12)" : "rgba(216,100,61,0.12)",
            borderColor: "rgba(30,31,34,0.06)",
            color: feedbackMessage.tone === "success" ? "var(--leaf-600)" : "var(--coral-600)",
          }}
        >
          {feedbackMessage.text}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ClientForm action="/api/members/absence" method="POST" className="soft-panel compact-form-grid p-5">
          <p className="section-kicker">Absences</p>
          <h4 className="display-title mt-2 text-2xl">Déclarer une indisponibilité</h4>
          <input name="householdId" type="hidden" value={context.household.id} />
          <label className="field-label">
            <span>Membre</span>
            <select className="field" name="memberId" defaultValue={context.currentMember?.id ?? ""} required>
              <option value="">Choisir un membre</option>
              {context.household.members.map((member) => (
                <option key={member.id} value={member.id}>{member.displayName}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field-label">
              <span>Début</span>
              <input className="field" type="date" name="startDate" required />
            </label>
            <label className="field-label">
              <span>Fin</span>
              <input className="field" type="date" name="endDate" required />
            </label>
          </div>
          <label className="field-label">
            <span>Note</span>
            <input className="field" type="text" name="notes" placeholder="Facultative" />
          </label>
          <div className="rounded-[1.2rem] border border-[rgba(56,115,93,0.12)] bg-[rgba(56,115,93,0.08)] px-4 py-3 text-sm leading-6 text-[var(--ink-700)]">
            Le planning futur est recalculé automatiquement.
          </div>
          <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
            Enregistrer l&apos;absence
          </button>
        </ClientForm>

        <ClientForm action={`/api/households/${context.household.id}/recalculate`} method="POST" className="soft-panel compact-form-grid p-5">
          <p className="section-kicker">Rééquilibrage</p>
          <h4 className="display-title mt-2 text-2xl">Recalculer les tâches futures</h4>
          <label className="field-label">
            <span>Gestion des tâches sautées</span>
            <select className="field" name="skipLoadPolicy" defaultValue="no_carry_over">
              <option value="carry_over">Reporter la charge</option>
              <option value="no_carry_over">Reprendre normalement</option>
            </select>
          </label>
          <label className="field-label">
            <span className="inline-flex items-start gap-3 rounded-[1rem] border border-[var(--line)] bg-white/70 px-4 py-3 font-medium text-[var(--ink-950)]">
              <input name="forceOverwriteManual" type="checkbox" className="mt-1" />
              <span>Écraser les modifications manuelles futures</span>
            </span>
          </label>
          <button className="btn-secondary w-full px-5 py-3 font-semibold" type="submit">
            Recalculer les tâches futures
          </button>
        </ClientForm>
      </div>

      <article className="soft-panel space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Absences planifiées</p>
            <h4 className="display-title mt-2 text-2xl">À venir</h4>
          </div>
          <span className="stat-pill px-3 py-1 text-sm">{upcomingAbsences.length} active{upcomingAbsences.length > 1 ? "s" : ""}</span>
        </div>
        {upcomingAbsences.length ? (
          <div className="space-y-3">
            {upcomingAbsences.map((absence) => (
              <div key={absence.id} className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ backgroundColor: absence.member.color }} />
                      <p className="font-semibold">{absence.member.displayName}</p>
                    </div>
                    <p className="mt-1 text-sm text-[var(--ink-700)]">
                      Du {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(absence.startDate)}
                      {" "}au {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(absence.endDate)}
                    </p>
                    {absence.notes ? <p className="mt-1 text-sm text-[var(--ink-700)]">{absence.notes}</p> : null}
                  </div>
                  <ClientForm action={`/api/members/absence/${absence.id}/delete`} method="POST">
                    <button className="btn-quiet px-4 py-2 text-sm font-semibold" type="submit">
                      Annuler l&apos;absence
                    </button>
                  </ClientForm>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/70 p-4 text-sm text-[var(--ink-700)]">
            Aucune absence future enregistrée.
          </div>
        )}
      </article>
    </section>
  );
}
