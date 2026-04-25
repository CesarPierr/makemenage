import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle2 } from "lucide-react";

type HomeHeaderProps = {
  firstName: string;
  todayCount: number;
  overdueCount: number;
  weekDone: number;
  weekTotal: number;
};

export function HomeHeader({ firstName, todayCount, overdueCount, weekDone, weekTotal }: HomeHeaderProps) {
  const dayLabel = format(new Date(), "EEEE d MMMM", { locale: fr });
  const progressPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

  return (
    <section className="app-surface glow-card rounded-[2rem] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
            {dayLabel}
          </p>
          <h1 className="display-title mt-1 truncate text-2xl leading-tight sm:text-3xl">
            Bonjour {firstName}
          </h1>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold"
          style={{ borderColor: "rgba(120, 53, 15, 0.2)", backgroundColor: "rgba(120, 53, 15, 0.08)", color: "#78350f" }}
        >
          <Calendar className="size-3.5" aria-hidden="true" />
          <span aria-live="polite">
            <span className="font-bold">{todayCount}</span> à faire aujourd&apos;hui
          </span>
        </span>
        {overdueCount > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold"
            style={{ borderColor: "rgba(127, 29, 29, 0.22)", backgroundColor: "rgba(127, 29, 29, 0.08)", color: "#7f1d1d" }}
          >
            <AlertCircle className="size-3.5" aria-hidden="true" />
            <span aria-live="polite">
              <span className="font-bold">{overdueCount}</span> en retard
            </span>
          </span>
        ) : null}
      </div>

      {weekTotal > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink-700)]">
              <CheckCircle2 className="size-3.5 text-[var(--leaf-600)]" aria-hidden="true" />
              Cette semaine
            </span>
            <span className="font-semibold text-[var(--ink-700)]">
              {weekDone} / {weekTotal} validée{weekTotal > 1 ? "s" : ""}
            </span>
          </div>
          <div
            className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progression hebdomadaire : ${progressPct}%`}
            style={{ backgroundColor: "rgba(30,31,34,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: "var(--leaf-500)" }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
