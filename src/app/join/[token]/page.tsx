import Link from "next/link";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getInviteState, getShareableInvite } from "@/lib/household-management";

type JoinInvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function JoinInvitePage({ params }: JoinInvitePageProps) {
  const { token } = await params;
  const invite = await getShareableInvite({ token });

  if (!invite) {
    notFound();
  }

  const state = getInviteState(invite);
  const user = await getCurrentUser();
  const next = `/join/${token}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-6">
      <section className="app-surface glow-card w-full rounded-[2.2rem] p-6 sm:p-8">
        <p className="section-kicker">Invitation</p>
        <h1 className="display-title mt-2 text-4xl leading-tight">Rejoindre le foyer {invite.household.name}</h1>
        <p className="mt-3 text-[var(--ink-700)]">
          Invitation créée par {invite.createdByMember?.displayName ?? "un membre du foyer"} avec le code {invite.code}.
        </p>

        <div className="mt-5 mobile-section-grid">
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Rôle prévu</p>
            <p className="mt-1 text-lg font-semibold capitalize">{invite.role}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Expire le</p>
            <p className="mt-1 text-lg font-semibold">
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(invite.expiresAt)}
            </p>
          </div>
        </div>

        {state !== "active" ? (
          <div className="mt-6 rounded-[1.4rem] border px-4 py-3 text-sm leading-6 text-[var(--coral-600)]" style={{ backgroundColor: "rgba(216, 100, 61, 0.12)", borderColor: "rgba(30, 31, 34, 0.06)" }}>
            Cette invitation n’est plus utilisable.
          </div>
        ) : null}

        {!user ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm leading-6 text-[var(--ink-700)]">
              Connectez-vous ou créez un compte pour rejoindre ce foyer. Une fois connecté, vous reviendrez automatiquement sur cette invitation.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link className="btn-primary px-5 py-3 text-center font-semibold" href={`/login?next=${encodeURIComponent(next)}`}>
                Se connecter
              </Link>
              <Link className="btn-secondary px-5 py-3 text-center font-semibold" href={`/register?next=${encodeURIComponent(next)}`}>
                Créer un compte
              </Link>
            </div>
          </div>
        ) : state === "active" ? (
          <form action={`/api/invitations/${token}/accept`} method="post" className="mt-6 space-y-3">
            <p className="text-sm leading-6 text-[var(--ink-700)]">
              Vous êtes connecté en tant que {user.displayName}. En rejoignant ce foyer, il apparaîtra dans votre liste de foyers et vous pourrez basculer entre eux.
            </p>
            <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
              Rejoindre ce foyer
            </button>
          </form>
        ) : (
          <Link className="btn-secondary mt-6 inline-flex px-5 py-3 font-semibold" href="/app">
            Retour à l’application
          </Link>
        )}
      </section>
    </main>
  );
}
