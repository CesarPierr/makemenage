import Link from "next/link";

import { requireGuest } from "@/lib/auth";

export default async function RegisterPage() {
  await requireGuest();

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
          <input className="field" type="text" name="displayName" placeholder="Prénom ou pseudo" required />
          <input className="field" type="email" name="email" placeholder="Email" required />
          <input className="field" type="password" name="password" placeholder="Mot de passe" required />
          <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
            Créer mon compte
          </button>
        </form>
        <p className="mt-5 text-sm leading-6 text-[var(--ink-700)]">
          Déjà inscrit ?{" "}
          <Link className="font-semibold text-[var(--coral-600)]" href="/login">
            Se connecter
          </Link>
        </p>
      </section>
    </main>
  );
}
