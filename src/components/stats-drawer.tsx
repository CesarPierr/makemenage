"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, BarChart2, CheckCircle2, Pencil, RotateCcw, SkipForward } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";

type MemberStat = {
  memberId: string;
  displayName: string;
  color: string;
  completedCount: number;
  plannedMinutes: number;
  completionRate: number;
};

type RollingPeriod = {
  days: number;
  byMember: Array<{
    memberId: string;
    displayName: string;
    color: string;
    completedCount: number;
    minutesSpent: number;
  }>;
};

type ActivityEntry = {
  id: string;
  actionType: string;
  createdAt: Date | string;
  actorName: string;
  taskTitle: string;
};

type StatsDrawerProps = {
  streak: number;
  memberStats: MemberStat[];
  rollingMetrics: RollingPeriod[];
  recentActivity?: ActivityEntry[];
  householdId?: string;
};

function getActivityMeta(actionType: string) {
  if (actionType === "completed") return { icon: CheckCircle2, verb: "a validé", accent: "var(--leaf-600)" };
  if (actionType === "skipped") return { icon: SkipForward, verb: "a passé", accent: "var(--ink-500)" };
  if (actionType === "rescheduled") return { icon: RotateCcw, verb: "a reporté", accent: "var(--sky-600)" };
  if (actionType === "edited") return { icon: Pencil, verb: "a modifié", accent: "var(--coral-600)" };
  if (actionType === "reassigned") return { icon: ArrowRight, verb: "a réattribué", accent: "var(--coral-600)" };
  return { icon: ArrowRight, verb: "a mis à jour", accent: "var(--ink-500)" };
}

export function StatsDrawer({ streak, memberStats, rollingMetrics, recentActivity = [], householdId }: StatsDrawerProps) {
  const [open, setOpen] = useState(false);

  const totalByPeriod = rollingMetrics.map((p) => ({
    days: p.days,
    total: p.byMember.reduce((s, m) => s + m.completedCount, 0),
  }));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="stat-pill flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm"
        aria-label="Voir les statistiques du foyer"
      >
        <BarChart2 className="size-4 opacity-60" />
        {streak > 0 ? (
          <span>🔥 {streak}j</span>
        ) : (
          <span>Stats</span>
        )}
      </button>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Statistiques du foyer">
        <div className="space-y-5 pb-2">

          {streak > 0 && (
            <div className="flex items-center gap-4 rounded-2xl bg-[rgba(216,100,61,0.08)] border border-[rgba(216,100,61,0.12)] p-4">
              <span className="text-4xl leading-none">🔥</span>
              <div>
                <p className="text-xl font-bold text-[var(--ink-950)]">
                  {streak} jour{streak > 1 ? "s" : ""} de suite
                </p>
                <p className="text-sm text-[var(--ink-700)] mt-0.5">
                  Le foyer a été actif chaque jour — continuez !
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-500)] mb-3">
              Complétions récentes
            </p>
            <div className="grid grid-cols-3 gap-2">
              {totalByPeriod.map(({ days, total }) => (
                <div key={days} className="soft-panel text-center px-3 py-4">
                  <p className="text-2xl font-bold text-[var(--ink-950)]">{total}</p>
                  <p className="mt-1 text-[0.65rem] text-[var(--ink-500)]">{days} derniers jours</p>
                </div>
              ))}
            </div>
          </div>

          {recentActivity.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-500)]">
                  Dernières activités
                </p>
                {householdId ? (
                  <Link
                    href={`/app/settings/activity?household=${householdId}`}
                    className="text-[0.65rem] font-semibold text-[var(--coral-600)] hover:underline"
                  >
                    Tout voir →
                  </Link>
                ) : null}
              </div>
              <ul className="space-y-1.5" aria-label="Activité récente">
                {recentActivity.slice(0, 5).map((entry) => {
                  const { icon: Icon, verb, accent } = getActivityMeta(entry.actionType);
                  return (
                    <li key={entry.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${accent}18`, color: accent }}
                      >
                        <Icon className="size-3" aria-hidden="true" />
                      </span>
                      <p className="min-w-0 flex-1 text-xs leading-4">
                        <strong className="font-semibold text-[var(--ink-950)]">{entry.actorName}</strong>{" "}
                        {verb}{" "}
                        <span className="font-semibold text-[var(--ink-950)]">{entry.taskTitle}</span>{" "}
                        <span className="text-[var(--ink-500)]">
                          {formatDistanceToNow(new Date(entry.createdAt), { locale: fr, addSuffix: true })}
                        </span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {memberStats.length > 0 && (
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-500)] mb-3">
                Charge par membre (30j)
              </p>
              <div className="space-y-2">
                {memberStats.map((m) => {
                  const maxPlanned = Math.max(...memberStats.map((s) => s.plannedMinutes), 1);
                  const barWidth = Math.round((m.plannedMinutes / maxPlanned) * 100);
                  return (
                    <div key={m.memberId} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: m.color }}
                          />
                          <span className="truncate font-medium text-[var(--ink-950)]">{m.displayName}</span>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--ink-500)]">
                          {m.completedCount} tâche{m.completedCount > 1 ? "s" : ""} · {Math.round(m.completionRate)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--line)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barWidth}%`, backgroundColor: m.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </BottomSheet>
    </>
  );
}
