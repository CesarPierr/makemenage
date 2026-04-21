import Link from "next/link";

import { requireGuest } from "@/lib/auth";

export default async function LoginPage() {
  await requireGuest();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6">
      <section className="app-surface glow-card w-full rounded-[2.2rem] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Connexion</p>
            <h1 className="display-title mt-2 text-4xl leading-tight">Retrouver le planning du foyer</h1>
          </div>
          <Link className="btn-secondary px-4 py-2 text-sm" href="/">
            Accueil
          </Link>
        </div>
        <p className="mt-3 text-[var(--ink-700)]">
          Connectez-vous pour voir vos tâches du jour, la semaine et l&apos;historique.
        </p>
        <div className="mt-5 mobile-section-grid">
          {[
            "Vue rapide des tâches du jour",
            "Actions en un geste sur téléphone",
            "Historique et calendrier toujours à portée",
          ].map((item) => (
            <div key={item} className="soft-panel px-4 py-3 text-sm text-[var(--ink-700)]">
              {item}
            </div>
          ))}
        </div>
        <form action="/api/auth/login" method="post" className="mt-8 space-y-4">
          <input className="field" type="email" name="email" placeholder="Email" required />
          <input className="field" type="password" name="password" placeholder="Mot de passe" required />
          <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
            Se connecter
          </button>
        </form>
        <p className="mt-5 text-sm leading-6 text-[var(--ink-700)]">
          Pas encore de compte ?{" "}
          <Link className="font-semibold text-[var(--coral-600)]" href="/register">
            Créer un compte
          </Link>
        </p>
      </section>
    </main>
  );
}
