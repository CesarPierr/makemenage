"use client";

import { useState } from "react";
import { CalendarClock, RotateCcw, Wallet } from "lucide-react";

import type { BudgetOverview, BudgetPeriod, SerializedPocket } from "@/lib/budget";
import { formatCurrency } from "@/lib/savings/currency";
import { cn } from "@/lib/utils";

function parseAmount(value: string): number {
  const n = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** A weekly quota costs `quota × weeks` over the month it applies to. */
function monthlyEquivalent(quota: number, period: BudgetPeriod, weekCount: number) {
  return period === "weekly" ? quota * weekCount : quota;
}

/** Allocation actually planned for next month: the prepared one, else today's. */
function effectiveOf(pocket: SerializedPocket): { quota: number; period: BudgetPeriod; planned: boolean } {
  return pocket.plannedQuota == null
    ? { quota: pocket.quota, period: pocket.period, planned: false }
    : { quota: pocket.plannedQuota, period: pocket.plannedPeriod ?? pocket.period, planned: true };
}

/**
 * « Mois prochain » — prepare next month's envelopes without touching the current
 * ones. Amounts are stamped with the month they target and go live on its 1st.
 */
export function BudgetNextMonth({
  overview,
  online,
  busy,
  onPlan,
  onClearPlan,
}: {
  overview: BudgetOverview;
  online: boolean;
  busy: boolean;
  onPlan: (pocketId: string, quota: number, period: BudgetPeriod) => void;
  onClearPlan: (pocketId: string) => void;
}) {
  const { next, pockets, totals } = overview;
  // Draft edits keyed by pocket, so typing stays smooth and only committed on blur.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [periods, setPeriods] = useState<Record<string, BudgetPeriod>>({});

  const amountOf = (p: SerializedPocket) => {
    const draft = drafts[p.id];
    return draft === undefined ? effectiveOf(p).quota : parseAmount(draft);
  };
  const periodOf = (p: SerializedPocket) => periods[p.id] ?? effectiveOf(p).period;

  const allocated = pockets.reduce((sum, p) => sum + monthlyEquivalent(amountOf(p), periodOf(p), next.weekCount), 0);
  const left = totals.income - totals.charges - allocated;

  const commit = (p: SerializedPocket) => {
    const quota = amountOf(p);
    const period = periodOf(p);
    const current = effectiveOf(p);
    if (quota === current.quota && period === current.period) return;
    if (quota <= 0) return;
    onPlan(p.id, quota, period);
  };

  return (
    <div className="space-y-3 animate-in fade-in sm:space-y-4">
      {/* Projection */}
      <div className="app-surface rounded-[1.4rem] p-4 sm:rounded-[1.6rem] sm:p-5">
        <p className="section-kicker">Reste à allouer</p>
        <p className={cn("display-title mt-1 text-4xl tabular-nums sm:text-5xl", left < 0 ? "text-red-600" : "text-leaf-600")}>
          {formatCurrency(left)}
        </p>
        <p className="mt-1 text-sm text-ink-500">
          Prévision pour <span className="font-semibold capitalize text-ink-800">{next.label}</span> — revenus et charges reconduits.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Revenus", value: totals.income, tone: "text-leaf-600" },
            { label: "Charges", value: totals.charges, tone: "text-ink-800" },
            { label: "Enveloppes", value: allocated, tone: "text-coral-600" },
          ].map((s) => (
            <div className="rounded-xl border border-line bg-white/60 p-2.5 dark:bg-surface/60" key={s.label}>
              <span className="text-[0.62rem] font-bold uppercase tracking-wide text-ink-500">{s.label}</span>
              <p className={cn("mt-0.5 text-sm font-bold tabular-nums", s.tone)}>{formatCurrency(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Allocations */}
      <div className="app-surface rounded-[1.4rem] p-4 sm:rounded-[1.6rem] sm:p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-600/10 text-sky-600">
            <Wallet className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="section-kicker block">Préparation</span>
            <span className="display-title block text-lg leading-none sm:text-xl">Enveloppes du mois prochain</span>
          </span>
        </div>

        {pockets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-500">
            Créez d&apos;abord des postes dans l&apos;aperçu.
          </p>
        ) : (
          <ul className="space-y-2">
            {pockets.map((p) => {
              const eff = effectiveOf(p);
              const changed = eff.planned;
              return (
                <li className="soft-panel flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5" key={p.id}>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {p.icon ? (
                      <span className="shrink-0 text-base leading-none">{p.icon}</span>
                    ) : (
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink-950">{p.name}</span>
                      <span className="block text-[0.68rem] text-ink-500">
                        Actuel {formatCurrency(p.quota)}/{p.period === "weekly" ? "sem" : "mois"}
                        {changed ? <span className="ml-1 font-semibold text-sky-600">· modifié</span> : null}
                      </span>
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-1.5">
                    <input
                      aria-label={`Budget de ${p.name} pour ${next.label}`}
                      className="field h-10 w-20 text-right tabular-nums"
                      disabled={!online || busy}
                      inputMode="decimal"
                      onBlur={() => commit(p)}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      value={drafts[p.id] ?? String(eff.quota)}
                    />
                    <span className="flex overflow-hidden rounded-lg border border-line">
                      {(["monthly", "weekly"] as BudgetPeriod[]).map((per) => (
                        <button
                          aria-pressed={periodOf(p) === per}
                          className={cn(
                            "px-2 py-2 text-[0.65rem] font-bold uppercase transition-colors",
                            periodOf(p) === per ? "bg-ink-950/[0.08] text-ink-950" : "text-ink-400",
                          )}
                          disabled={!online || busy}
                          key={per}
                          onClick={() => {
                            setPeriods((s) => ({ ...s, [p.id]: per }));
                            const quota = amountOf(p);
                            if (quota > 0 && (quota !== eff.quota || per !== eff.period)) onPlan(p.id, quota, per);
                          }}
                          type="button"
                        >
                          {per === "weekly" ? "sem" : "mois"}
                        </button>
                      ))}
                    </span>
                    {changed ? (
                      <button
                        aria-label={`Annuler la préparation de ${p.name}`}
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-black/[0.05] hover:text-ink-700"
                        disabled={!online || busy}
                        onClick={() => {
                          setDrafts((d) => {
                            const nextDrafts = { ...d };
                            delete nextDrafts[p.id];
                            return nextDrafts;
                          });
                          setPeriods((s) => {
                            const nextPeriods = { ...s };
                            delete nextPeriods[p.id];
                            return nextPeriods;
                          });
                          onClearPlan(p.id);
                        }}
                        type="button"
                      >
                        <RotateCcw className="size-4" />
                      </button>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-500">
          <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
          Ces montants remplaceront vos enveloppes au 1<sup>er</sup> <span className="capitalize">{next.label}</span>. Votre budget du mois
          en cours n&apos;est pas modifié.
        </p>
      </div>
    </div>
  );
}
