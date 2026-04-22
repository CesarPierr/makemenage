import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { ArrowRight, CheckCircle2, RotateCcw, SkipForward } from "lucide-react";

import { CollapsibleList } from "@/components/collapsible-list";
import { requireUser } from "@/lib/auth";
import {
  filterHistoryLogs,
  getHistoryActionDescription,
  getHistoryActionLabel,
  type HistoryFilter,
  summarizeHistoryLogs,
} from "@/lib/history";
import { requireHouseholdContext } from "@/lib/households";

type HistoryPageProps = {
  searchParams: Promise<{ household?: string; filter?: HistoryFilter }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);
  const visibleLogs = context.actionLogs.filter((log) => log.actionType !== "created");
  const activeFilter: HistoryFilter =
    params.filter === "completed" ||
    params.filter === "skipped" ||
    params.filter === "rescheduled" ||
    params.filter === "edited"
      ? params.filter
      : "all";
  const filteredLogs = filterHistoryLogs(visibleLogs, activeFilter);
  const historySummary = summarizeHistoryLogs(visibleLogs);
  const todayLogs = filteredLogs.filter((log) => isToday(log.createdAt));
  const earlierLogs = filteredLogs.filter((log) => !isToday(log.createdAt));
  const buildFilterHref = (filter: HistoryFilter) => {
    const search = new URLSearchParams();

    if (params.household) {
      search.set("household", params.household);
    }

    if (filter !== "all") {
      search.set("filter", filter);
    }

    return `/app/history?${search.toString()}`;
  };

  function getActionTone(actionType: string) {
    if (actionType === "completed") {
      return {
        icon: CheckCircle2,
        accent: "var(--leaf-600)",
        surface: "rgba(56, 115, 93, 0.1)",
      };
    }

    if (actionType === "skipped") {
      return {
        icon: SkipForward,
        accent: "var(--ink-950)",
        surface: "rgba(30, 31, 34, 0.06)",
      };
    }

    if (actionType === "rescheduled") {
      return {
        icon: RotateCcw,
        accent: "var(--sky-600)",
        surface: "rgba(47, 109, 136, 0.1)",
      };
    }

    return {
      icon: ArrowRight,
      accent: "var(--coral-600)",
      surface: "rgba(216, 100, 61, 0.1)",
    };
  }

  return (
    <section className="space-y-4">
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Historique</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Les dernières actions utiles</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ink-700)]">
          Un journal plus utile pour retrouver vite ce qui a été validé, sauté, déplacé ou corrigé.
        </p>
        <div className="mt-5 summary-strip sm:grid-cols-2 xl:grid-cols-4">
          <div className="metric-card interactive-surface px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Terminées</p>
            <p className="mt-1 text-2xl font-semibold">{historySummary.completed}</p>
          </div>
          <div className="metric-card interactive-surface px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Sautées</p>
            <p className="mt-1 text-2xl font-semibold">{historySummary.skipped}</p>
          </div>
          <div className="metric-card interactive-surface px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Reportées</p>
            <p className="mt-1 text-2xl font-semibold">{historySummary.rescheduled}</p>
          </div>
          <div className="metric-card interactive-surface px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Corrections</p>
            <p className="mt-1 text-2xl font-semibold">{historySummary.edited}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { value: "all" as const, label: "Tout" },
            { value: "completed" as const, label: "Terminées" },
            { value: "skipped" as const, label: "Sautées" },
            { value: "rescheduled" as const, label: "Reportées" },
            { value: "edited" as const, label: "Corrections" },
          ].map((filter) => {
            const active = filter.value === activeFilter;

            return (
              <Link
                key={filter.value}
                href={buildFilterHref(filter.value)}
                className={active ? "accent-pill border-[var(--ink-950)] text-[var(--ink-950)]" : "accent-pill"}
              >
                <span
                  className="accent-pill-dot"
                  style={{
                    backgroundColor:
                      filter.value === "completed"
                        ? "var(--leaf-500)"
                        : filter.value === "skipped"
                          ? "var(--ink-500)"
                          : filter.value === "rescheduled"
                            ? "var(--sky-500)"
                            : filter.value === "edited"
                              ? "var(--coral-500)"
                              : "var(--line-strong)",
                  }}
                />
                {filter.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {todayLogs.length ? (
          <section className="app-surface deferred-section rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Aujourd’hui</p>
                <h3 className="display-title mt-2 text-2xl">À l’instant</h3>
              </div>
              <span className="accent-pill">
                <span className="accent-pill-dot" style={{ backgroundColor: "var(--leaf-500)" }} />
                {todayLogs.length} action{todayLogs.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-5 space-y-2">
              {todayLogs.map((log) => {
                const actionLabel = getHistoryActionLabel(log.actionType);
                const actionDescription = getHistoryActionDescription(log);
                const tone = getActionTone(log.actionType);
                const Icon = tone.icon;

                return (
                  <article key={log.id} className="app-surface flex items-center gap-4 rounded-[1.3rem] p-3 transition-all hover:bg-white/50">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm"
                      style={{ backgroundColor: tone.surface, color: tone.accent, border: `1px solid ${tone.accent}20` }}
                    >
                      <Icon className="size-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate font-semibold text-[var(--ink-950)]">{log.occurrence.taskTemplate.title}</h3>
                        <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--ink-500)]">
                          {format(log.createdAt, "HH:mm", { locale: fr })}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[var(--ink-700)]">
                        <span className="font-bold" style={{ color: tone.accent }}>{actionLabel}</span> · {actionDescription}
                      </p>
                    </div>
                    <div className="hidden shrink-0 sm:block">
                      <span className="rounded-full bg-[var(--line)] px-2.5 py-1 text-[0.65rem] font-bold text-[var(--ink-700)]">
                        {log.actorMember?.displayName ?? "Système"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {earlierLogs.length ? (
          <section className="app-surface deferred-section rounded-[2rem] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Avant</p>
                <h3 className="display-title mt-2 text-2xl">Historique récent</h3>
              </div>
              <span className="accent-pill">
                <span className="accent-pill-dot" style={{ backgroundColor: "var(--sky-500)" }} />
                {earlierLogs.length} entrée{earlierLogs.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="mt-5">
              <CollapsibleList
                initialCount={5}
                label="Voir l'historique complet"
                items={earlierLogs.map((log) => {
                  const actionLabel = getHistoryActionLabel(log.actionType);
                  const actionDescription = getHistoryActionDescription(log);
                  const tone = getActionTone(log.actionType);
                  const Icon = tone.icon;

                  return (
                    <article key={log.id} className="app-surface flex items-center gap-4 rounded-[1.3rem] p-3 transition-all hover:bg-white/50">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm"
                        style={{ backgroundColor: tone.surface, color: tone.accent, border: `1px solid ${tone.accent}20` }}
                      >
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate font-semibold text-[var(--ink-950)]">{log.occurrence.taskTemplate.title}</h3>
                          <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--ink-500)]">
                            {format(log.createdAt, "dd MMM", { locale: fr })}
                          </span>
                        </div>
                        <p className="truncate text-xs text-[var(--ink-700)]">
                          <span className="font-bold" style={{ color: tone.accent }}>{actionLabel}</span> · {actionDescription}
                        </p>
                      </div>
                      <div className="hidden shrink-0 sm:block">
                        <span className="rounded-full bg-[var(--line)] px-2.5 py-1 text-[0.65rem] font-bold text-[var(--ink-700)]">
                          {log.actorMember?.displayName ?? "Système"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              />
            </div>
          </section>
        ) : null}

        {!filteredLogs.length && (
          <div className="app-surface rounded-[1.8rem] p-5 text-sm leading-6 text-[var(--ink-700)]">
            Rien de marquant pour ce filtre. Les validations, sauts, reports et corrections utiles apparaîtront ici.
          </div>
        )}
      </div>
    </section>
  );
}
