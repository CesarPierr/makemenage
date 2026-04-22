import { describeRecurrence } from "@/lib/scheduling/recurrence";
import { CopyValueButton } from "@/components/copy-value-button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";

type SettingsPageProps = {
  searchParams: Promise<{
    household?: string;
    invite?: string;
    leave?: string;
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
            : null;

  return (
    <div className="space-y-4">
      <section className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Réglages</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Membres, absences et règles</h2>
        <p className="mt-3 text-[var(--ink-700)]">
          Toute la configuration de V1 est regroupée ici pour rester simple sur mobile.
        </p>
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
          <p className="mt-2 text-sm text-[var(--ink-700)]">
            Un même compte peut appartenir à plusieurs foyers. Depuis ici, vous pouvez passer de l’un à l’autre ou en créer un nouveau.
          </p>
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
          <form action="/api/households" method="post" className="mt-6 grid gap-3">
            <input className="field" type="text" name="name" placeholder="Nom du nouveau foyer" required />
            <input className="field" type="text" name="timezone" defaultValue={context.household.timezone} required />
            <button className="btn-primary px-5 py-3 font-semibold" type="submit">
              Créer un autre foyer
            </button>
          </form>
        </article>

        <article className="app-surface rounded-[2rem] p-5 sm:p-6">
          <p className="section-kicker">Rejoindre</p>
          <h3 className="display-title mt-2 text-3xl">Ajouter un foyer à mon compte</h3>
          <p className="mt-2 text-sm text-[var(--ink-700)]">
            Si quelqu’un vous a partagé un code, vous pouvez relier ce foyer à votre compte sans perdre les autres.
          </p>
          <form action="/api/invitations/redeem" method="post" className="mt-5 space-y-3">
            <input className="field" type="text" name="code" placeholder="Code d’invitation" required />
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
            <p className="section-kicker">Invitations</p>
            <h3 className="display-title mt-2 text-3xl">Partager un accès compte</h3>
            <p className="mt-2 text-sm text-[var(--ink-700)]">
              Générez un lien ou un code à envoyer. La personne pourra rejoindre ce foyer avec son propre compte.
            </p>
            <form action={`/api/households/${context.household.id}/invites`} method="post" className="mt-5 grid gap-3">
              <select className="field" name="role" defaultValue="member">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <input className="field" type="number" min="1" max="30" name="expiresInDays" defaultValue="7" />
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
