"use client";

import { Clock3, Pause, Play, SkipForward, TimerReset } from "lucide-react";

import { formatRelative } from "@/lib/relative-date";

type FocusOccurrence = {
  scheduledDate: Date;
  taskTemplate: { title: string; estimatedMinutes: number };
};

type FocusSessionProps = {
  room: string;
  status: "running" | "paused";
  currentIndex: number;
  totalCount: number;
  currentOccurrence: FocusOccurrence;
  nextOccurrence: FocusOccurrence | null;
  elapsedMs: number;
  isSubmitting: boolean;
  onPauseOrResume: (eventTimeMs: number) => void;
  onFinishWithTimer: () => void;
  onSkip: () => void;
  onStop: () => void;
};

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getEventTimeMs(eventTimeStamp: number) {
  return Math.round(performance.timeOrigin + eventTimeStamp);
}

export function FocusSession({
  room,
  status,
  currentIndex,
  totalCount,
  currentOccurrence,
  nextOccurrence,
  elapsedMs,
  isSubmitting,
  onPauseOrResume,
  onFinishWithTimer,
  onSkip,
  onStop,
}: FocusSessionProps) {
  return (
    <section
      aria-label="Session en cours"
      className="app-surface glow-card rounded-[2rem] border-2 border-sky-500/30 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="section-kicker">Session en cours</p>
          <h3 className="display-title mt-1 truncate text-xl sm:text-2xl">{room}</h3>
        </div>
        <span aria-live="polite" className="accent-pill shrink-0">
          <span className="accent-pill-dot" style={{ backgroundColor: "var(--sky-500)" }} />
          {status === "running" ? "En cours" : "En pause"}
        </span>
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-line bg-glass-bg p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div aria-live="polite" className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
              Tâche {currentIndex + 1} / {totalCount}
            </p>
            <h4 className="mt-1 text-xl font-semibold text-ink-950">
              {currentOccurrence.taskTemplate.title}
            </h4>
            <p className="mt-1 text-xs text-ink-700">
              Prévue {formatRelative(currentOccurrence.scheduledDate)}
            </p>
            {nextOccurrence ? (
              <p className="mt-1 text-xs text-ink-500">
                Ensuite : <span className="font-semibold text-ink-700">{nextOccurrence.taskTemplate.title}</span>
                {nextOccurrence.taskTemplate.estimatedMinutes ? ` · ${nextOccurrence.taskTemplate.estimatedMinutes} min` : ""}
              </p>
            ) : null}
          </div>

          <div className="rounded-[1.2rem] border border-line bg-[rgba(47,109,136,0.08)] px-4 py-2.5 text-center">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ink-500">
              Temps réel
            </p>
            <p className="mt-0.5 text-2xl font-semibold text-ink-950">{formatElapsed(elapsedMs)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
            onClick={(event) => onPauseOrResume(getEventTimeMs(event.timeStamp))}
            type="button"
          >
            {status === "running" ? <Pause className="size-4" /> : <Play className="size-4" />}
            {status === "running" ? "Pause" : "Reprendre"}
          </button>
          <button
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onFinishWithTimer}
            type="button"
          >
            <Clock3 className="size-4" />
            Terminer
          </button>
          <button
            className="btn-quiet inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onSkip}
            type="button"
          >
            <SkipForward className="size-4" />
            Passer
          </button>
          <button
            className="btn-quiet inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ink-500"
            onClick={onStop}
            type="button"
          >
            <TimerReset className="size-4" />
            Arrêter
          </button>
        </div>
      </div>
    </section>
  );
}
