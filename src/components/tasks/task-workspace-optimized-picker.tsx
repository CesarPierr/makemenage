"use client";

import { addDays, startOfDay } from "date-fns";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { getEventTimeMs } from "@/lib/running-session";

type WorkspaceOccurrence = {
  id: string;
  scheduledDate: Date | string;
  status: string;
  notes: string | null;
  actualMinutes: number | null;
  assignedMemberId?: string | null;
  taskTemplateId?: string;
  isManuallyModified?: boolean;
  rescheduleCount?: number;
  taskTemplate: {
    title: string;
    category: string | null;
    room?: string | null;
    icon?: string | null;
    estimatedMinutes: number;
    color: string;
    isCollective?: boolean;
  };
  assignedMember: { id: string; displayName: string; color: string } | null;
  wasCompletedAlone?: boolean | null;
  updatedAt: Date | string;
  completedAt?: Date | string | null;
};

type TaskWorkspaceOptimizedPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  filteredActiveOccurrences: WorkspaceOccurrence[];
  today: Date;
  onStartSession: (horizonDays: number, startedAt: number) => void;
};

export function TaskWorkspaceOptimizedPicker({
  isOpen,
  onClose,
  filteredActiveOccurrences,
  today,
  onStartSession,
}: TaskWorkspaceOptimizedPickerProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Mode optimisé"
    >
      <div className="space-y-3">
        <p className="text-sm leading-6 text-ink-700">
          Regroupez les tâches d&apos;aujourd&apos;hui et des prochains jours en une seule session.
          À chaque tâche terminée, le calendrier des occurrences suivantes est recalculé à partir de
          la date de réalisation.
        </p>
        {[1, 2, 3].map((h) => {
          const cutoff = addDays(today, h);
          const count = filteredActiveOccurrences.filter(
            (o) => startOfDay(new Date(o.scheduledDate)).getTime() < cutoff.getTime(),
          ).length;
          const label =
            h === 1 ? "Aujourd'hui" : h === 2 ? "Aujourd'hui + demain" : "Aujourd'hui + 2 jours";
          return (
            <button
              key={h}
              className="flex w-full items-center justify-between rounded-2xl border border-line bg-glass-bg px-4 py-3 text-left transition-all hover:bg-black/[0.04] active:scale-[0.98] disabled:opacity-40"
              disabled={count === 0}
              onClick={(event) => onStartSession(h, getEventTimeMs(event.timeStamp))}
              type="button"
            >
              <div>
                <p className="text-sm font-semibold text-ink-950">{label}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {h} jour{h > 1 ? "s" : ""} de planning
                </p>
              </div>
              <span className="stat-pill px-3 py-1 text-xs font-semibold">
                {count} tâche{count > 1 ? "s" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
