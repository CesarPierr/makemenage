import Link from "next/link";
import { requireGuest } from "@/lib/auth";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ sent?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  await requireGuest();
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6">
      <section className="auth-shell app-surface glow-card w-full rounded-[2.2rem] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Sécurité</p>
            <h1 className="display-title mt-2 text-4xl leading-tight">Mot de passe oublié</h1>
          </div>
          <Link className="btn-secondary px-4 py-2 text-sm" href="/login">
            Retour
          </Link>
        </div>

        {sent ? (
          <>
            <div
              className="mt-6 rounded-[1.4rem] px-4 py-4 text-sm leading-6"
              style={{ backgroundColor: "rgba(56, 115, 93, 0.12)", border: "1px solid rgba(30, 31, 34, 0.06)" }}
            >
              <p className="font-semibold text-ink-950">Email envoyé</p>
              <p className="mt-1 text-ink-700">
                Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation dans les prochaines
                minutes. Pensez à vérifier vos spams.
              </p>
            </div>
            <p className="mt-6 text-sm text-ink-700">
              <Link className="font-semibold text-coral-600" href="/login">
                Retour à la connexion
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-700">
              Entrez votre adresse email. Si un compte existe, vous recevrez un lien pour créer un nouveau mot de passe.
            </p>
            <form action="/api/auth/forgot-password" method="post" className="mt-8 space-y-4">
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
              <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
                Envoyer le lien de réinitialisation
              </button>
            </form>
            <p className="mt-5 text-sm text-ink-700">
              Vous vous souvenez ?{" "}
              <Link className="font-semibold text-coral-600" href="/login">
                Se connecter
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
