import { requireUser } from "@/lib/auth";
import { requireHouseholdContext } from "@/lib/households";
import { ClientForm } from "@/components/shared/client-form";

type HouseholdsPageProps = {
  searchParams: Promise<{ household?: string; leave?: string }>;
};

export default async function HouseholdsSettingsPage({ searchParams }: HouseholdsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);
  const householdMemberships = user.memberships;

  const feedbackMessage =
    params.leave === "last_account"
      ? { tone: "error" as const, text: "Votre compte est le dernier relié au foyer." }
      : params.leave === "last_manager"
        ? { tone: "error" as const, text: "Un owner ou admin doit rester rattaché au foyer." }
        : null;

  return (
    <section className="app-surface rounded-[2rem] p-5 sm:p-6 space-y-5">
      <div>
        <p className="section-kicker">Foyers</p>
        <h3 className="display-title mt-2 text-3xl">Changer de foyer</h3>
      </div>

      {feedbackMessage ? (
        <div
          className="rounded-[1.4rem] border border-[rgba(216,100,61,0.2)] bg-[rgba(216,100,61,0.12)] px-4 py-3 text-sm leading-6 text-coral-600"
        >
          {feedbackMessage.text}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="soft-panel p-5 sm:p-6 space-y-5">
          <h4 className="display-title text-2xl">Mes foyers</h4>
          <div className="space-y-3">
            {householdMemberships.map((membership) => {
              const active = membership.householdId === context.household.id;

              return (
                <div key={membership.id} className="rounded-[1.3rem] border border-line bg-white/75 dark:bg-[#262830]/75 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{membership.household.name}</p>
                      <p className="text-sm text-ink-700">
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
          <ClientForm action="/api/households" method="POST" className="compact-form-grid">
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
          </ClientForm>
        </article>

        <article className="soft-panel p-5 sm:p-6 space-y-5">
          <h4 className="display-title text-2xl">Rejoindre un foyer</h4>
          <ClientForm action="/api/invitations/redeem" method="POST" className="compact-form-grid">
            <label className="field-label">
              <span>Code</span>
              <input className="field" type="text" name="code" placeholder="Code d'invitation" required />
            </label>
            <button className="btn-secondary w-full px-5 py-3 font-semibold" type="submit">
              Rejoindre avec un code
            </button>
          </ClientForm>
          <ClientForm action={`/api/households/${context.household.id}/leave`} method="POST">
            <button className="btn-secondary w-full px-5 py-3 font-semibold" type="submit">
              Quitter ce foyer
            </button>
          </ClientForm>
        </article>
      </div>
    </section>
  );
}
