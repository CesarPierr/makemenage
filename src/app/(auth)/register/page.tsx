import Link from "next/link";

import { requireGuest } from "@/lib/auth";

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  await requireGuest();
  const params = await searchParams;
  const next = params.next ?? "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6">
      <section className="app-surface glow-card w-full rounded-[2.2rem] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Inscription</p>
            <h1 className="display-title mt-2 text-4xl leading-tight">Créer votre base ménage</h1>
          </div>
          <Link className="btn-secondary px-4 py-2 text-sm" href="/">
            Accueil
          </Link>
        </div>
        <p className="mt-3 text-[var(--ink-700)]">
          Créez votre compte, puis votre foyer. La configuration peut se faire entièrement depuis le téléphone.
        </p>
        {params.error === "invalid_registration" ? (
          <div
            className="mt-5 rounded-[1.4rem] border px-4 py-3 text-sm leading-6 text-[var(--coral-600)]"
            style={{
              backgroundColor: "rgba(216, 100, 61, 0.12)",
              borderColor: "rgba(30, 31, 34, 0.06)",
            }}
          >
            Vérifiez les informations saisies. Le mot de passe doit faire au moins 8 caractères.
          </div>
        ) : null}
        <div className="mt-5 mobile-section-grid">
          {[
            "Démarrage rapide sans écran inutile",
            "Création du foyer juste après l’inscription",
            "Pensé pour rester pratique en navigateur mobile",
          ].map((item) => (
            <div key={item} className="soft-panel px-4 py-3 text-sm text-[var(--ink-700)]">
              {item}
            </div>
          ))}
        </div>
        <form action="/api/auth/register" method="post" className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next} />
          <input
            autoComplete="nickname"
            className="field"
            type="text"
            name="displayName"
            placeholder="Prénom ou pseudo"
            required
          />
          <input
            autoCapitalize="none"
            autoComplete="email"
            className="field"
            inputMode="email"
            type="email"
            name="email"
            placeholder="Email"
            required
          />
          <input
            autoComplete="new-password"
            className="field"
            type="password"
            name="password"
            placeholder="Mot de passe"
            required
          />
          <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
            Créer mon compte
          </button>
        </form>
        <p className="mt-5 text-sm leading-6 text-[var(--ink-700)]">
          Déjà inscrit ?{" "}
          <Link
            className="font-semibold text-[var(--coral-600)]"
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          >
            Se connecter
          </Link>
        </p>
      </section>
    </main>
  );
}
