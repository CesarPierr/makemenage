import Link from "next/link";

import { requireGuest } from "@/lib/auth";

export default async function RegisterPage() {
  await requireGuest();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="app-surface w-full rounded-[2rem] p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--leaf-600)]">Inscription</p>
        <h1 className="display-title mt-2 text-4xl">Créer votre base ménage</h1>
        <p className="mt-3 text-[var(--ink-700)]">
          Créez votre compte, puis votre foyer. La configuration peut se faire entièrement depuis le téléphone.
        </p>
        <form action="/api/auth/register" method="post" className="mt-8 space-y-4">
          <input className="field" type="text" name="displayName" placeholder="Prénom ou pseudo" required />
          <input className="field" type="email" name="email" placeholder="Email" required />
          <input className="field" type="password" name="password" placeholder="Mot de passe" required />
          <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
            Créer mon compte
          </button>
        </form>
        <p className="mt-5 text-sm text-[var(--ink-700)]">
          Déjà inscrit ?{" "}
          <Link className="font-semibold text-[var(--coral-600)]" href="/login">
            Se connecter
          </Link>
        </p>
      </section>
    </main>
  );
}
