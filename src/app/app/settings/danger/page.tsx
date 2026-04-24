import { requireUser } from "@/lib/auth";
import { requireHouseholdContext } from "@/lib/households";
import { redirect } from "next/navigation";
import { ClientForm } from "@/components/client-form";

type DangerPageProps = {
  searchParams: Promise<{ household?: string; delete?: string }>;
};

export default async function DangerSettingsPage({ searchParams }: DangerPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);

  if (context.membership.role !== "owner") {
    redirect(`/app/settings?household=${context.household.id}`);
  }

  const feedbackMessage =
    params.delete === "confirm_required"
      ? { tone: "error" as const, text: "Veuillez confirmer la suppression du foyer." }
      : params.delete === "forbidden"
        ? { tone: "error" as const, text: "Seul un owner peut supprimer le foyer." }
        : params.delete === "not_found"
          ? { tone: "error" as const, text: "Foyer introuvable ou accès refusé." }
          : null;

  return (
    <section className="app-surface rounded-[2rem] p-5 sm:p-6 space-y-5">
      <div>
        <p className="section-kicker text-red-700">Zone sensible</p>
        <h3 className="display-title mt-2 text-3xl text-red-900">Actions irréversibles</h3>
      </div>

      {feedbackMessage ? (
        <div className="rounded-[1.4rem] border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
          {feedbackMessage.text}
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-red-200/70 bg-red-50/75 p-5 space-y-4">
        <div>
          <h4 className="font-bold text-red-900">Supprimer le foyer « {context.household.name} »</h4>
          <p className="mt-1 text-sm text-red-700">
            Cette action est définitive. Toutes les tâches, occurrences et données associées seront supprimées.
          </p>
        </div>
        <ClientForm action={`/api/households/${context.household.id}/delete`} method="POST" className="space-y-4">
          <label className="field-label">
            <span className="inline-flex items-start gap-3 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-900">
              <input name="confirmDelete" type="checkbox" className="mt-1" />
              <span>Je confirme la suppression définitive de ce foyer.</span>
            </span>
          </label>
          <button
            className="btn-primary w-full border-none bg-red-700 px-5 py-3 font-semibold hover:bg-red-800"
            type="submit"
          >
            Supprimer le foyer
          </button>
        </ClientForm>
      </div>
    </section>
  );
}
