import Link from "next/link";

import { CopyValueButton } from "@/components/copy-value-button";
import { IntegrationSettingsPanel } from "@/components/integration-settings-panel";
import { MemberSettingsList } from "@/components/member-settings-list";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";
import { getOpenClawIntegrationSettings } from "@/lib/integrations/openclaw";

type SettingsPanel = "households" | "team" | "access" | "planning" | "integrations" | "danger";

type SettingsPageProps = {
  searchParams: Promise<{
    household?: string;
    panel?: SettingsPanel;
    invite?: string;
    leave?: string;
    rebalance?: string;
    delete?: string;
    member?: string;
    integration?: string;
    generatedKey?: string;
  }>;
};

function isPanel(value: string | undefined): value is SettingsPanel {
  return value === "households" || value === "team" || value === "access" || value === "planning" || value === "integrations" || value === "danger";
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);
  const manageable = canManageHousehold(context.membership.role);
  const activeInvites = manageable
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
  const openClawSettings = manageable ? await getOpenClawIntegrationSettings(context.household.id) : null;
  const feedbackMessage =
    params.invite === "created"
      ? { tone: "success" as const, text: "Invitation créée." }
      : params.invite === "invalid"
        ? { tone: "error" as const, text: "Impossible de créer cette invitation." }
        : params.member === "updated"
          ? { tone: "success" as const, text: "Profil du foyer mis à jour." }
          : params.member === "invalid"
            ? { tone: "error" as const, text: "Impossible d’enregistrer ce membre." }
            : params.leave === "last_account"
              ? { tone: "error" as const, text: "Votre compte est le dernier relié au foyer." }
              : params.leave === "last_manager"
                ? { tone: "error" as const, text: "Un owner ou admin doit rester rattaché au foyer." }
                : params.delete === "confirm_required"
                  ? { tone: "error" as const, text: "Veuillez confirmer la suppression du foyer." }
                  : params.delete === "forbidden"
                    ? { tone: "error" as const, text: "Seul un owner peut supprimer le foyer." }
                    : params.delete === "not_found"
                      ? { tone: "error" as const, text: "Foyer introuvable ou accès refusé." }
                      : params.rebalance === "done"
                        ? { tone: "success" as const, text: "Rééquilibrage terminé." }
                        : params.rebalance === "done_overwrite"
                          ? { tone: "success" as const, text: "Rééquilibrage terminé avec écrasement des modifications futures." }
                          : params.integration === "saved"
                            ? { tone: "success" as const, text: "Réglages OpenClaw enregistrés." }
                            : params.integration === "disabled"
                              ? { tone: "success" as const, text: "Intégration OpenClaw désactivée." }
                              : params.integration === "invalid"
                                ? { tone: "error" as const, text: "Impossible d’enregistrer cette intégration." }
                                : params.integration === "forbidden"
                                  ? { tone: "error" as const, text: "Accès refusé pour cette intégration." }
                                  : params.integration === "key_created"
                                    ? { tone: "success" as const, text: "Nouvelle clé d’accès générée." }
                          : null;

  const inferredPanel = isPanel(params.panel)
    ? params.panel
    : params.member
      ? "team"
      : params.invite
        ? "access"
        : params.rebalance
          ? "planning"
          : params.integration
            ? "integrations"
          : params.delete
            ? "danger"
            : params.leave
              ? "households"
              : null;
  const activePanel =
    inferredPanel === "access" && !manageable
      ? null
      : inferredPanel === "planning" && !manageable
        ? null
        : inferredPanel === "integrations" && !manageable
          ? null
        : inferredPanel === "danger" && context.membership.role !== "owner"
          ? null
          : inferredPanel;

  const panelCards = [
    {
      id: "households" as const,
      label: "Foyers",
      description: "Changer, créer, rejoindre ou quitter un foyer.",
      stat: `${householdMemberships.length} lié${householdMemberships.length > 1 ? "s" : ""}`,
    },
    {
      id: "team" as const,
      label: "Équipe",
      description: manageable ? "Gérer les membres et leurs profils." : "Voir et modifier votre profil foyer.",
      stat: `${context.household.members.length} membre${context.household.members.length > 1 ? "s" : ""}`,
    },
    ...(manageable
      ? [
          {
            id: "access" as const,
            label: "Accès",
            description: "Créer et partager les invitations du foyer.",
            stat: `${activeInvites.length} active${activeInvites.length > 1 ? "s" : ""}`,
          },
          {
            id: "planning" as const,
            label: "Planning",
            description: "Absences et recalcul des tâches futures.",
            stat: "Rééquilibrage",
          },
          {
            id: "integrations" as const,
            label: "Intégrations",
            description: "OpenClaw, IA locale et connectivité MCP avancée.",
            stat: openClawSettings?.isEnabled ? "Active" : "Avancé",
          },
        ]
      : []),
    ...(context.membership.role === "owner"
      ? [
          {
            id: "danger" as const,
            label: "Zone sensible",
            description: "Suppression définitive du foyer.",
            stat: "Owner",
          },
        ]
      : []),
  ];

  const panelBaseHref = (panel?: SettingsPanel) =>
    panel ? `/app/settings?household=${context.household.id}&panel=${panel}` : `/app/settings?household=${context.household.id}`;

  return (
    <div className="space-y-4">
      <section className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Réglages</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Organisation du foyer</h2>
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
        {manageable ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn-primary px-4 py-2.5 text-sm font-semibold" href={`/app/my-tasks?household=${context.household.id}#administration`}>
              Gérer les tâches récurrentes
            </Link>
            <Link className="btn-secondary px-4 py-2.5 text-sm font-semibold" href={`/app/my-tasks?household=${context.household.id}#new-task`}>
              Créer une tâche
            </Link>
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {panelCards.map((panel) => {
          const active = activePanel === panel.id;

          return (
            <Link
              key={panel.id}
              href={panelBaseHref(panel.id)}
              className="app-surface rounded-[1.7rem] p-4 transition-all hover:-translate-y-0.5"
              style={{
                borderColor: active ? "rgba(47, 109, 136, 0.18)" : undefined,
                background: active
                  ? "linear-gradient(135deg, rgba(47, 109, 136, 0.1), rgba(255,255,255,0.92))"
                  : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-950)]">{panel.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--ink-700)]">{panel.description}</p>
                </div>
                <span className="stat-pill px-3 py-1 text-xs font-semibold">{panel.stat}</span>
              </div>
            </Link>
          );
        })}
      </section>

      {activePanel ? (
        <section className="app-surface rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Sous-menu</p>
              <h3 className="display-title mt-2 text-3xl">
                {panelCards.find((panel) => panel.id === activePanel)?.label}
              </h3>
            </div>
            <Link className="btn-quiet px-4 py-2 text-sm font-semibold" href={panelBaseHref()}>
              Revenir aux rubriques
            </Link>
          </div>

          {activePanel === "households" ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="soft-panel p-5 sm:p-6">
                <p className="section-kicker">Mes foyers</p>
                <h4 className="display-title mt-2 text-3xl">Changer de foyer</h4>
                <div className="mt-5 space-y-3">
                  {householdMemberships.map((membership) => {
                    const active = membership.householdId === context.household.id;

                    return (
                      <div key={membership.id} className="rounded-[1.3rem] border border-[var(--line)] bg-white/75 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

              <article className="soft-panel p-5 sm:p-6">
                <p className="section-kicker">Rejoindre</p>
                <h4 className="display-title mt-2 text-3xl">Ajouter un foyer</h4>
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
            </div>
          ) : null}

          {activePanel === "team" ? (
            <div className="mt-5 space-y-5">
              <div>
                <p className="section-kicker">Équipe</p>
                <h4 className="display-title mt-2 text-3xl">{manageable ? "Membres" : "Mon profil foyer"}</h4>
              </div>
              <MemberSettingsList
                canManage={manageable}
                currentUserId={user.id}
                householdId={context.household.id}
                members={context.household.members.map((member) => ({
                  id: member.id,
                  displayName: member.displayName,
                  color: member.color,
                  role: member.role,
                  weeklyCapacityMinutes: member.weeklyCapacityMinutes,
                  userId: member.userId,
                }))}
              />

              {manageable ? (
                <form action={`/api/households/${context.household.id}/members`} method="post" className="soft-panel compact-form-grid p-5">
                  <p className="text-sm font-semibold text-[var(--ink-950)]">Ajouter un membre</p>
                  <label className="field-label">
                    <span>Nom</span>
                    <input className="field" type="text" name="displayName" placeholder="Nom affiché" required />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="field-label">
                      <span>Couleur</span>
                      <input className="field h-[3.2rem] px-2" type="color" name="color" defaultValue="#E86A33" />
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
              ) : null}
            </div>
          ) : null}

          {activePanel === "access" && manageable ? (
            <div className="mt-5 space-y-5">
              <div>
                <p className="section-kicker">Accès</p>
                <h4 className="display-title mt-2 text-3xl">Partager l’accès</h4>
              </div>
              <form action={`/api/households/${context.household.id}/invites`} method="post" className="soft-panel compact-form-grid p-5">
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

              <div className="space-y-3">
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
                  <div className="soft-panel p-4 text-sm text-[var(--ink-700)]">Aucune invitation active.</div>
                )}
              </div>
            </div>
          ) : null}

          {activePanel === "planning" && manageable ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <form action="/api/members/absence" method="post" className="soft-panel compact-form-grid p-5">
                <p className="section-kicker">Absences</p>
                <h4 className="display-title mt-2 text-2xl">Déclarer une indisponibilité</h4>
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

              <form action={`/api/households/${context.household.id}/recalculate`} method="post" className="soft-panel compact-form-grid p-5">
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
              </form>
            </div>
          ) : null}

          {activePanel === "integrations" && manageable ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
              <IntegrationSettingsPanel
                canManage={manageable}
                householdId={context.household.id}
                initialSettings={openClawSettings ?? {
                  householdId: context.household.id,
                  provider: "mcp_openclaw",
                  isEnabled: false,
                  serverUrl: null,
                  clientLabel: null,
                  apiKeyPreview: null,
                  hasApiKey: false,
                  updatedAt: null,
                }}
              />

              <div className="space-y-4">
                <article className="soft-panel p-5">
                  <p className="section-kicker">État</p>
                  <h4 className="display-title mt-2 text-2xl">
                    {openClawSettings?.isEnabled ? "Connexion prête" : "Connexion inactive"}
                  </h4>
                  <div className="mt-4 space-y-2 text-sm text-[var(--ink-700)]">
                    <p>Provider: `mcp_openclaw`</p>
                    <p>Clé actuelle: {openClawSettings?.apiKeyPreview ?? "aucune"}</p>
                    <p>Discovery: {`${appBaseUrl}/api/integrations/mcp/openclaw/discovery?householdId=${context.household.id}`}</p>
                    <p>Tâches: {`${appBaseUrl}/api/integrations/mcp/openclaw/tasks`}</p>
                    <p>Upcoming: {`${appBaseUrl}/api/integrations/mcp/openclaw/upcoming`}</p>
                  </div>
                </article>

                <article className="soft-panel space-y-3 p-5">
                  <p className="text-sm font-semibold text-[var(--ink-950)]">Connexions rapides</p>
                  <CopyValueButton
                    label="Copier la discovery URL"
                    value={`${appBaseUrl}/api/integrations/mcp/openclaw/discovery?householdId=${context.household.id}`}
                  />
                  <CopyValueButton
                    label="Copier l’id du foyer"
                    value={context.household.id}
                  />
                  {params.generatedKey ? (
                    <CopyValueButton
                      label="Copier la clé générée"
                      value={params.generatedKey}
                    />
                  ) : null}
                </article>
              </div>
            </div>
          ) : null}

          {activePanel === "danger" && context.membership.role === "owner" ? (
            <div className="mt-5">
              <form action={`/api/households/${context.household.id}/delete`} method="post" className="soft-panel compact-form-grid border border-red-200/70 bg-red-50/75 p-5">
                <p className="section-kicker text-red-700">Zone sensible</p>
                <h4 className="display-title mt-2 text-3xl text-red-900">Supprimer ce foyer</h4>
                <label className="field-label">
                  <span className="inline-flex items-start gap-3 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-900">
                    <input name="confirmDelete" type="checkbox" className="mt-1" />
                    <span>Je confirme la suppression définitive de ce foyer.</span>
                  </span>
                </label>
                <button className="btn-primary w-full border-none bg-red-700 px-5 py-3 font-semibold hover:bg-red-800" type="submit">
                  Supprimer le foyer
                </button>
              </form>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
