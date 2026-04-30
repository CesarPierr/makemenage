import crypto from "crypto";
import Link from "next/link";
import { requireGuest } from "@/lib/auth";
import { db } from "@/lib/db";

type ResetPasswordPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({ params, searchParams }: ResetPasswordPageProps) {
  await requireGuest();
  const { token: rawToken } = await params;
  const { error } = await searchParams;

  // Validate token server-side so we can show an appropriate message
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  const isValid = record && !record.usedAt && record.expiresAt >= new Date();

  if (!isValid) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6">
        <section className="auth-shell app-surface glow-card w-full rounded-[2.2rem] p-6 sm:p-8">
          <p className="section-kicker">Sécurité</p>
          <h1 className="display-title mt-2 text-4xl leading-tight">Lien invalide</h1>
          <div
            className="mt-6 rounded-[1.4rem] px-4 py-4 text-sm leading-6"
            style={{ backgroundColor: "rgba(216, 100, 61, 0.12)", border: "1px solid rgba(30, 31, 34, 0.06)" }}
          >
            <p className="font-semibold text-coral-600">Lien expiré ou déjà utilisé</p>
            <p className="mt-1 text-ink-700">
              Ce lien de réinitialisation n&apos;est plus valide. Faites une nouvelle demande.
            </p>
          </div>
          <p className="mt-6 text-sm text-ink-700">
            <Link className="font-semibold text-coral-600" href="/forgot-password">
              Nouvelle demande
            </Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6">
      <section className="auth-shell app-surface glow-card w-full rounded-[2.2rem] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Sécurité</p>
            <h1 className="display-title mt-2 text-4xl leading-tight">Nouveau mot de passe</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-700">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>

        {error === "invalid" ? (
          <div
            className="mt-5 rounded-[1.4rem] px-4 py-3 text-sm leading-6"
            style={{ backgroundColor: "rgba(216, 100, 61, 0.12)", border: "1px solid rgba(30, 31, 34, 0.06)" }}
          >
            <p className="font-semibold text-coral-600">
              Les mots de passe ne correspondent pas ou sont trop courts.
            </p>
          </div>
        ) : null}

        <form action="/api/auth/reset-password" method="post" className="mt-8 space-y-4">
          <input type="hidden" name="token" value={rawToken} />
          <input
            autoComplete="new-password"
            className="field"
            type="password"
            name="password"
            placeholder="Nouveau mot de passe"
            minLength={8}
            required
          />
          <input
            autoComplete="new-password"
            className="field"
            type="password"
            name="confirm"
            placeholder="Confirmer le mot de passe"
            minLength={8}
            required
          />
          <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
            Changer le mot de passe
          </button>
        </form>
      </section>
    </main>
  );
}
