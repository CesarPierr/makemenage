import Link from "next/link";
import { House, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--sand-50)] px-4">
      <div className="app-surface w-full max-w-md rounded-[2rem] p-8 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-3xl bg-[rgba(216,100,61,0.12)] text-[var(--coral-600)]">
          <Search className="size-8" />
        </div>
        <h1 className="display-title text-3xl">Page introuvable</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-700)]">
          Cette page n&apos;existe pas ou a été déplacée. Retournez à l&apos;accueil pour continuer.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold"
            href="/app"
          >
            <House className="size-4" />
            Tableau de bord
          </Link>
          <Link
            className="btn-secondary inline-flex items-center justify-center px-5 py-3 text-sm font-semibold"
            href="/"
          >
            Page d&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
