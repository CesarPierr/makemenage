import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, House, Shuffle } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";

const pillars = [
  {
    icon: CheckCircle2,
    title: "Actions du quotidien en 1 geste",
    description: "Marquer fait, reporter ou réassigner depuis le téléphone sans ouvrir dix écrans.",
  },
  {
    icon: Shuffle,
    title: "Rotation juste et compréhensible",
    description: "Alternance stricte, round-robin ou équilibrage par charge avec règles explicites.",
  },
  {
    icon: CalendarDays,
    title: "Vue semaine et calendrier",
    description: "Savoir qui fait quoi aujourd'hui, cette semaine et sur le mois sans friction.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="app-surface mb-6 flex items-center justify-between rounded-[2rem] px-5 py-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--leaf-600)]">MakeMenage</p>
          <h1 className="display-title text-2xl">Le planning ménage qui tourne vraiment bien</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link className="btn-secondary px-4 py-2 text-sm" href="/login">
            Connexion
          </Link>
          <Link className="btn-primary px-4 py-2 text-sm" href="/register">
            Créer un compte
          </Link>
        </div>
      </header>

      <section className="grid flex-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="app-surface rounded-[2.5rem] p-6 sm:p-10">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-[rgba(56,115,93,0.12)] px-3 py-1 text-sm text-[var(--leaf-600)]">
            <House className="size-4" />
            Couple, famille, colocation
          </div>
          <h2 className="display-title max-w-3xl text-4xl leading-tight sm:text-6xl">
            Répartissez les tâches ménagères avec une logique claire, mobile et auto-hébergeable.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--ink-700)]">
            Conçu pour les foyers qui veulent une vraie rotation des tâches, pas juste une checklist.
            Tout est pensé pour le navigateur du téléphone, puis pour le desktop.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 font-semibold" href="/register">
              Commencer maintenant
              <ArrowRight className="size-4" />
            </Link>
            <Link className="btn-secondary inline-flex items-center justify-center px-5 py-3" href="/login">
              Se connecter
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {pillars.map(({ icon: Icon, title, description }) => (
            <article key={title} className="app-surface rounded-[2rem] p-5">
              <div className="mb-4 inline-flex rounded-2xl bg-[rgba(216,100,61,0.14)] p-3 text-[var(--coral-600)]">
                <Icon className="size-5" />
              </div>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-2 leading-7 text-[var(--ink-700)]">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
