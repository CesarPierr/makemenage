import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plane, Trash2 } from "lucide-react";

import { ClientForm } from "@/components/shared/client-form";
import { requireUser } from "@/lib/auth";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";
import { listHolidays } from "@/lib/holidays";

type HolidaysPageProps = {
  searchParams: Promise<{ household?: string; shifted?: string; deleted?: string; error?: string }>;
};

export default async function HolidaysPage({ searchParams }: HolidaysPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);

  if (!canManageHousehold(context.membership.role)) {
    return (
      <section className="app-surface rounded-[2rem] p-6 text-sm text-ink-700">
        Cette page est réservée aux admins du foyer.
      </section>
    );
  }

  const holidays = await listHolidays(context.household.id);
  const today = new Date();

  const feedback =
    params.shifted !== undefined
      ? `Période enregistrée. ${params.shifted} occurrence${Number(params.shifted) > 1 ? "s" : ""} déplacée${Number(params.shifted) > 1 ? "s" : ""} après les vacances.`
      : params.deleted === "1"
        ? "Période supprimée. Les occurrences déjà déplacées restent à leur nouvelle date."
        : params.error === "invalid"
          ? "Dates invalides."
          : params.error === "order"
            ? "La date de fin doit être postérieure à la date de début."
            : null;

  return (
    <section className="space-y-4">
      <div className="app-surface rounded-[2rem] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(47,109,136,0.1)] text-sky-600">
            <Plane className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="display-title text-2xl leading-tight">Vacances du foyer</h2>
            <p className="mt-1 text-sm leading-6 text-ink-700">
              Déclarez une période où tout le foyer est en pause. Les tâches prévues sur ces dates sont automatiquement décalées juste après.
            </p>
          </div>
        </div>

        {feedback ? (
          <div className="mt-4 rounded-2xl border border-[rgba(56,115,93,0.18)] bg-[rgba(56,115,93,0.06)] px-4 py-3 text-sm text-leaf-600">
            {feedback}
          </div>
        ) : null}

        <ClientForm
          action={`/api/households/${context.household.id}/holidays`}
          method="POST"
          className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]"
          successMessage="Période enregistrée."
          errorMessage="Impossible d'enregistrer la période."
        >
          <label className="field-label">
            <span>Du</span>
            <input className="field" name="startDate" required type="date" />
          </label>
          <label className="field-label">
            <span>Au</span>
            <input className="field" name="endDate" required type="date" />
          </label>
          <label className="field-label">
            <span>Étiquette (facultatif)</span>
            <input className="field" name="label" placeholder="Ex: vacances d'été" type="text" maxLength={60} />
          </label>
          <div className="flex items-end">
            <button className="btn-primary w-full px-4 py-3 text-sm font-semibold" type="submit">
              Déclarer
            </button>
          </div>
        </ClientForm>
      </div>

      <div className="app-surface rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Périodes enregistrées</p>
        <h3 className="display-title mt-1 text-xl">Historique</h3>

        {holidays.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line p-5 text-center text-sm text-ink-500">
            Aucune période déclarée pour l&apos;instant.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {holidays.map((holiday) => {
              const isPast = holiday.endDate < today;
              return (
                <li
                  key={holiday.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/70 dark:bg-[#262830]/70 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-950">
                      {format(holiday.startDate, "d MMM", { locale: fr })} —{" "}
                      {format(holiday.endDate, "d MMM yyyy", { locale: fr })}
                      {holiday.label ? <span className="text-ink-500"> · {holiday.label}</span> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {isPast ? "Période passée" : "À venir / en cours"}
                    </p>
                  </div>
                  <ClientForm
                    action={`/api/households/${context.household.id}/holidays/${holiday.id}`}
                    method="POST"
                    className=""
                    successMessage="Période supprimée."
                    errorMessage="Impossible de supprimer."
                  >
                    <button
                      aria-label="Supprimer la période"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/70 dark:bg-[#262830]/70 px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-50"
                      type="submit"
                    >
                      <Trash2 className="size-3.5" />
                      Supprimer
                    </button>
                  </ClientForm>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
