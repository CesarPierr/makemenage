import { CopyValueButton } from "@/components/copy-value-button";
import { TaskSettingsList } from "@/components/task-settings-list";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";

type SettingsPageProps = {
  searchParams: Promise<{
    household?: string;
    invite?: string;
    leave?: string;
    rebalance?: string;
    delete?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);
  const activeInvites = canManageHousehold(context.membership.role)
    ? await db.householdInvite.findMany({
        where: {
          householdId: context.household.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    : [];
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const householdMemberships = user.memberships;
  const feedbackMessage =
    params.invite === "created"
      ? { tone: "success" as const, text: "Invitation créée. Vous pouvez maintenant partager le lien ou le code." }
      : params.invite === "invalid"
        ? { tone: "error" as const, text: "Impossible de créer cette invitation avec les valeurs fournies." }
        : params.leave === "last_account"
          ? { tone: "error" as const, text: "Impossible de quitter ce foyer: votre compte est le dernier encore relié au foyer." }
          : params.leave === "last_manager"
            ? { tone: "error" as const, text: "Impossible de quitter ce foyer: il faut d’abord qu’un autre compte garde un rôle owner/admin." }
              : params.delete === "confirm_required"
                ? { tone: "error" as const, text: "Veuillez confirmer la suppression du foyer." }
                : params.delete === "forbidden"
                  ? { tone: "error" as const, text: "Seul un owner peut supprimer le foyer." }
                  : params.delete === "not_found"
                    ? { tone: "error" as const, text: "Foyer introuvable ou accès refusé." }
              : params.rebalance === "done"
                ? { tone: "success" as const, text: "Rééquilibrage terminé sans écraser les modifications manuelles." }
                : params.rebalance === "done_overwrite"
                  ? { tone: "success" as const, text: "Rééquilibrage terminé en écrasant les modifications manuelles futures." }
            : null;
  const manualFutureOverrides = context.tasks.length
    ? await db.taskOccurrence.findMany({
        where: {
          householdId: context.household.id,
          taskTemplateId: {
            in: context.tasks.map((task) => task.id),
          },
          status: {
            in: ["planned", "due", "overdue", "rescheduled"],
          },
          scheduledDate: {
            gte: new Date(),
          },
          isManuallyModified: true,
        },
        select: {
          taskTemplateId: true,
        },
      })
    : [];
  const manualOverridesByTaskId = manualFutureOverrides.reduce<Record<string, number>>((acc, occurrence) => {
    acc[occurrence.taskTemplateId] = (acc[occurrence.taskTemplateId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <section className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Réglages</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Membres, absences et règles</h2>
        {feedbackMessage ? (
          <div
            className="mt-5 rounded-[1.4rem] border px-4 py-3 text-sm leading-6"
            style={{
              backgroundColor:
                feedbackMessage.tone === "success" ? "rgba(56, 115, 93, 0.12)" : "rgba(216, 100, 61, 0.12)",
              borderColor: "rgba(30, 31, 34, 0.06)",
              color: feedbackMessage.tone === "success" ? "var(--leaf-600)" : "var(--coral-600)",
            }}
          >
            {feedbackMessage.text}
          </div>
        ) : null}
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

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="app-surface rounded-[2rem] p-5 sm:p-6">
          <p className="section-kicker">Mes foyers</p>
          <h3 className="display-title mt-2 text-3xl">Basculer ou en créer un autre</h3>
          <div className="mt-5 space-y-3">
            {householdMemberships.map((membership) => {
              const active = membership.householdId === context.household.id;

              return (
                <div key={membership.id} className="soft-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{membership.household.name}</p>
                    <p className="text-sm text-[var(--ink-700)]">
                      Rôle {membership.role} {active ? "· foyer actif" : ""}
                    </p>
                  </div>
                  {active ? (
                    <span className="stat-pill px-3 py-1 text-sm">Actuel</span>
                  ) : (
                    <a className="btn-secondary px-4 py-2 text-sm font-semibold" href={`/app?household=${membership.householdId}`}>
                      Ouvrir
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          <form action="/api/households" method="post" className="mt-6 compact-form-grid">
            <label className="field-label">
              <span>Nouveau foyer</span>
              <input className="field" type="text" name="name" placeholder="Nom du nouveau foyer" required />
            </label>
            <label className="field-label">
              <span>Fuseau horaire</span>
              <input className="field" type="text" name="timezone" defaultValue={context.household.timezone} required />
            </label>
            <button className="btn-primary px-5 py-3 font-semibold" type="submit">
              Créer un autre foyer
            </button>
          </form>
        </article>

        <article className="app-surface rounded-[2rem] p-5 sm:p-6">
          <p className="section-kicker">Rejoindre</p>
          <h3 className="display-title mt-2 text-3xl">Ajouter un foyer à mon compte</h3>
          <form action="/api/invitations/redeem" method="post" className="mt-5 compact-form-grid">
            <label className="field-label">
              <span>Code</span>
              <input className="field" type="text" name="code" placeholder="Code d’invitation" required />
            </label>
            <button className="btn-secondary w-full px-5 py-3 font-semibold" type="submit">
              Rejoindre avec un code
            </button>
          </form>
          <form action={`/api/households/${context.household.id}/leave`} method="post" className="mt-6">
            <button className="btn-secondary w-full px-5 py-3 font-semibold" type="submit">
              Quitter ce foyer
            </button>
          </form>
        </article>
      </section>

      {canManageHousehold(context.membership.role) ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <article className="app-surface rounded-[2rem] p-5 sm:p-6">
            <p className="section-kicker">Équipe</p>
            <h3 className="display-title mt-2 text-3xl">Ajouter un membre</h3>
            <form action={`/api/households/${context.household.id}/members`} method="post" className="mt-5 compact-form-grid">
              <label className="field-label">
                <span>Nom</span>
                <input className="field" type="text" name="displayName" placeholder="Nom affiché" required />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="field-label">
                  <span>Couleur</span>
                  <input className="field" type="color" name="color" defaultValue="#E86A33" />
                </label>
                <label className="field-label">
                  <span>Rôle</span>
                  <select className="field" name="role" defaultValue="member">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </label>
                <label className="field-label">
                  <span>Capacité</span>
                  <input className="field" type="number" name="weeklyCapacityMinutes" min="0" placeholder="Min / semaine" />
                </label>
              </div>
              <label className="field-label">
                <span className="inline-flex items-center gap-3 rounded-[1rem] border border-[var(--line)] bg-white/70 px-4 py-3 font-medium text-[var(--ink-950)]">
                  <input defaultChecked name="includeInExistingTasks" type="checkbox" value="on" />
                  Inclure ce membre dans les tâches futures existantes
                </span>
              </label>
              <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
                Ajouter le membre
              </button>
            </form>
            <div className="mt-5 space-y-2">
              {context.household.members.map((member) => (
                <div key={member.id} className="soft-panel flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="size-3 rounded-full" style={{ backgroundColor: member.color }} />
                    <div>
                      <p className="font-semibold">{member.displayName}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">{member.role}</p>
                    </div>
                  </div>
                  {member.weeklyCapacityMinutes ? (
                    <span className="stat-pill px-3 py-1 text-xs">{member.weeklyCapacityMinutes} min</span>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="app-surface rounded-[2rem] p-5 sm:p-6">
            <p className="section-kicker">Invitations</p>
            <h3 className="display-title mt-2 text-3xl">Partager un accès compte</h3>
            <form action={`/api/households/${context.household.id}/invites`} method="post" className="mt-5 compact-form-grid">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field-label">
                  <span>Rôle</span>
                  <select className="field" name="role" defaultValue="member">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </label>
                <label className="field-label">
                  <span>Expiration</span>
                  <input className="field" type="number" min="1" max="30" name="expiresInDays" defaultValue="7" />
                </label>
              </div>
              <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
                Créer une invitation
              </button>
            </form>
            <div className="mt-5 space-y-3">
              {activeInvites.length ? (
                activeInvites.map((invite) => {
                  const joinLink = `${appBaseUrl}/join/${invite.token}`;

                  return (
                    <div key={invite.id} className="soft-panel space-y-3 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">Code {invite.code}</p>
                          <p className="text-sm text-[var(--ink-700)]">
                            Rôle {invite.role} · expire le{" "}
                            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(invite.expiresAt)}
                          </p>
                        </div>
                        <span className="stat-pill px-3 py-1 text-sm">Active</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <CopyValueButton label="Copier le lien" value={joinLink} />
                        <CopyValueButton label="Copier le code" value={invite.code} />
                      </div>
                      <a className="text-sm font-semibold text-[var(--coral-600)]" href={joinLink}>
                        Ouvrir le lien d’invitation
                      </a>
                    </div>
                  );
                })
              ) : (
                <div className="soft-panel p-4 text-sm leading-6 text-[var(--ink-700)]">
                  Aucune invitation active pour ce foyer pour le moment.
                </div>
              )}
            </div>
          </article>

          <article className="app-surface rounded-[2rem] p-5 sm:p-6">
            <p className="section-kicker">Planning</p>
            <h3 className="display-title mt-2 text-3xl">Déclarer une absence</h3>
            <form action="/api/members/absence" method="post" className="mt-5 compact-form-grid">
              <label className="field-label">
                <span>Membre</span>
                <select className="field" name="memberId" defaultValue={context.currentMember?.id ?? ""} required>
                  <option value="">Choisir un membre</option>
                  {context.household.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
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
              <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
                Enregistrer l’absence
              </button>
            </form>
          </article>

          <article className="app-surface rounded-[2rem] p-5 sm:p-6">
            <p className="section-kicker">Réassignation automatique</p>
            <h3 className="display-title mt-2 text-3xl">Recalculer l&apos;équilibrage</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-700)]">
              Recalcule les occurrences futures après ajout/suppression de membre ou changement de règle. Les modifications manuelles restent protégées par défaut.
            </p>
            <form action={`/api/households/${context.household.id}/recalculate`} method="post" className="mt-5 compact-form-grid">
              <label className="field-label">
                <span>Gestion de la charge après tâches sautées/absence</span>
                <select className="field" name="skipLoadPolicy" defaultValue="no_carry_over">
                  <option value="carry_over">Report de charge (rattrapage ensuite)</option>
                  <option value="no_carry_over">Sans report (reprise normale)</option>
                </select>
              </label>
              <label className="field-label">
                <span className="inline-flex items-start gap-3 rounded-[1rem] border border-[var(--line)] bg-white/70 px-4 py-3 font-medium text-[var(--ink-950)]">
                  <input name="forceOverwriteManual" type="checkbox" className="mt-1" />
                  <span>Écraser les modifications manuelles futures pendant ce recalcul</span>
                </span>
              </label>
              <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
                Recalculer et rééquilibrer
              </button>
            </form>
          </article>

          {context.membership.role === "owner" ? (
            <article className="app-surface rounded-[2rem] p-5 sm:p-6 border border-red-200/70">
              <p className="section-kicker text-red-700">Zone sensible</p>
              <h3 className="display-title mt-2 text-3xl text-red-900">Supprimer ce foyer</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-700)]">
                Cette action supprime le foyer et toutes ses données (tâches, occurrences, historique, invitations).
              </p>
              <form action={`/api/households/${context.household.id}/delete`} method="post" className="mt-5 compact-form-grid">
                <label className="field-label">
                  <span className="inline-flex items-start gap-3 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-900">
                    <input name="confirmDelete" type="checkbox" className="mt-1" />
                    <span>Je confirme la suppression définitive de ce foyer.</span>
                  </span>
                </label>
                <button className="btn-primary w-full px-5 py-3 font-semibold bg-red-700 hover:bg-red-800 border-none" type="submit">
                  Supprimer le foyer
                </button>
              </form>
            </article>
          ) : null}
        </section>
      ) : null}

      <section className="app-surface rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Meta-tâches</p>
            <h3 className="display-title mt-2 text-3xl">Récapitulatif et édition</h3>
          </div>
        </div>
        <TaskSettingsList 
          tasks={context.tasks} 
          members={context.household.members} 
          householdId={context.household.id} 
          manualOverridesByTaskId={manualOverridesByTaskId}
        />
      </section>
    </div>
  );
}
