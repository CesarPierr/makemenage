"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="app-surface w-full max-w-md rounded-[2rem] p-6 text-center sm:p-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[rgba(216,100,61,0.12)] text-[var(--coral-600)]">
          <AlertCircle className="size-7" />
        </div>
        <h2 className="display-title mt-4 text-2xl">Quelque chose n&apos;a pas marché</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-700)]">
          {error.message || "Une erreur inattendue est survenue. Réessayez ou revenez plus tard."}
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-[var(--ink-500)]">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold"
            onClick={reset}
            type="button"
          >
            <RotateCcw className="size-4" />
            Réessayer
          </button>
          <a
            className="btn-secondary inline-flex items-center justify-center px-5 py-3 text-sm font-semibold"
            href="/app"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </div>
  );
}
