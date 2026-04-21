import { describeRecurrence } from "@/lib/scheduling/recurrence";
import { requireUser } from "@/lib/auth";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";

type SettingsPageProps = {
  searchParams: Promise<{ household?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);

  return (
    <div className="space-y-4">
      <section className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Réglages</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Membres, absences et règles</h2>
        <p className="mt-3 text-[var(--ink-700)]">
          Toute la configuration de V1 est regroupée ici pour rester simple sur mobile.
        </p>
        <div className="mt-5 mobile-section-grid sm:grid-cols-3">
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Membres</p>
            <p className="mt-1 text-2xl font-semibold">{context.household.members.length}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Tâches actives</p>
            <p className="mt-1 text-2xl font-semibold">{context.tasks.length}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Mon rôle</p>
            <p className="mt-1 text-2xl font-semibold capitalize">{context.membership.role}</p>
          </div>
        </div>
      </section>

      {canManageHousehold(context.membership.role) ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <article className="app-surface rounded-[2rem] p-5 sm:p-6">
            <p className="section-kicker">Équipe</p>
            <h3 className="display-title mt-2 text-3xl">Ajouter un membre</h3>
            <p className="mt-2 text-sm text-[var(--ink-700)]">
              Nom, couleur et capacité hebdo suffisent pour commencer proprement.
            </p>
            <form action={`/api/households/${context.household.id}/members`} method="post" className="mt-5 space-y-3">
              <input className="field" type="text" name="displayName" placeholder="Nom affiché" required />
              <input className="field" type="color" name="color" defaultValue="#E86A33" />
              <select className="field" name="role" defaultValue="member">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <input className="field" type="number" name="weeklyCapacityMinutes" min="0" placeholder="Capacité hebdo (min)" />
              <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
                Ajouter le membre
              </button>
            </form>
          </article>

          <article className="app-surface rounded-[2rem] p-5 sm:p-6">
            <p className="section-kicker">Planning</p>
            <h3 className="display-title mt-2 text-3xl">Déclarer une absence</h3>
            <p className="mt-2 text-sm text-[var(--ink-700)]">
              Cela permet d&apos;éviter des répartitions injustes pendant une absence temporaire.
            </p>
            <form action="/api/members/absence" method="post" className="mt-5 space-y-3">
              <select className="field" name="memberId" defaultValue={context.currentMember?.id ?? ""} required>
                <option value="">Choisir un membre</option>
                {context.household.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
              <input className="field" type="date" name="startDate" required />
              <input className="field" type="date" name="endDate" required />
              <input className="field" type="text" name="notes" placeholder="Notes facultatives" />
              <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
                Enregistrer l’absence
              </button>
            </form>
          </article>
        </section>
      ) : null}

      <section className="app-surface rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Règles actives</p>
            <h3 className="display-title mt-2 text-3xl">Tâches configurées</h3>
          </div>
          <p className="text-sm text-[var(--ink-700)]">
            Chaque carte résume la récurrence et le mode d&apos;attribution retenus.
          </p>
        </div>
        <div className="mt-5 space-y-3">
          {context.tasks.map((task) => (
            <article key={task.id} className="soft-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold">{task.title}</h4>
                  <p className="text-sm text-[var(--ink-700)]">
                    {describeRecurrence({
                      type: task.recurrenceRule.type,
                      interval: task.recurrenceRule.interval,
                      weekdays: Array.isArray(task.recurrenceRule.weekdays)
                        ? task.recurrenceRule.weekdays.map(Number)
                        : undefined,
                      dayOfMonth: task.recurrenceRule.dayOfMonth,
                      anchorDate: task.recurrenceRule.anchorDate,
                      dueOffsetDays: task.recurrenceRule.dueOffsetDays,
                    })}
                  </p>
                </div>
                <span className="stat-pill px-3 py-1 text-sm capitalize">{task.assignmentRule.mode}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
