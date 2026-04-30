import Link from "next/link";

import { requireGuest } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    registered?: string;
    existing?: string;
    error?: string;
    email?: string;
    next?: string;
    reset?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await requireGuest();
  const params = await searchParams;
  const email = params.email ?? "";
  const next = params.next ?? "";

  const feedbackMessage =
    params.reset === "1"
      ? {
          tone: "success" as const,
          text: "Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.",
        }
      : params.registered === "1"
        ? {
            tone: "success" as const,
            text: "Compte créé. Connectez-vous pour accéder à votre foyer.",
          }
        : params.existing === "1"
          ? {
              tone: "neutral" as const,
              text: "Un compte existe déjà avec cet email. Connectez-vous directement.",
            }
          : params.error === "invalid_credentials"
            ? {
                tone: "error" as const,
                text: "Email ou mot de passe incorrect. Vérifiez vos identifiants puis réessayez.",
              }
            : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6">
      <section className="auth-shell app-surface glow-card w-full rounded-[2.2rem] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Connexion</p>
            <h1 className="display-title mt-2 text-4xl leading-tight">Se connecter</h1>
          </div>
          <Link className="btn-secondary px-4 py-2 text-sm" href="/">
            Accueil
          </Link>
        </div>
        <p className="mt-3 text-sm text-ink-700">Tâches, calendrier et historique du foyer.</p>
        {feedbackMessage ? (
          <div
            className="mt-5 rounded-[1.4rem] px-4 py-3 text-sm leading-6"
            style={{
              backgroundColor:
                feedbackMessage.tone === "success"
                  ? "rgba(56, 115, 93, 0.12)"
                  : feedbackMessage.tone === "error"
                    ? "rgba(216, 100, 61, 0.12)"
                    : "rgba(239, 226, 205, 0.82)",
              border: "1px solid rgba(30, 31, 34, 0.06)",
              color:
                feedbackMessage.tone === "error" ? "var(--coral-600)" : "var(--ink-950)",
            }}
          >
            {feedbackMessage.text}
          </div>
        ) : null}
        <form action="/api/auth/login" method="post" className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next} />
          <input
            autoCapitalize="none"
            autoComplete="email"
            className="field"
            defaultValue={email}
            inputMode="email"
            type="email"
            name="email"
            placeholder="Email"
            required
          />
          <input
            autoComplete="current-password"
            className="field"
            type="password"
            name="password"
            placeholder="Mot de passe"
            required
          />
          <button className="btn-primary w-full px-5 py-3 font-semibold" type="submit">
            Se connecter
          </button>
        </form>
        <p className="mt-4 text-sm text-ink-700">
          <Link className="font-semibold text-coral-600" href="/forgot-password">
            Mot de passe oublié ?
          </Link>
        </p>
        <p className="mt-3 text-sm text-ink-700">
          Pas encore de compte ?{" "}
          <Link
            className="font-semibold text-coral-600"
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          >
            Créer un compte
          </Link>
        </p>
      </section>
    </main>
  );
}
