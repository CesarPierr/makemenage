"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  MoreHorizontal,
  RotateCcw,
  SkipForward,
} from "lucide-react";

import { TaskDetailSheet } from "@/components/task-detail-sheet";
import { useToast } from "@/components/ui/toast";
import { formatMinutes } from "@/lib/utils";

type OccurrenceCardProps = {
  occurrence: {
    id: string;
    scheduledDate: Date | string;
    status: string;
    notes: string | null;
    actualMinutes: number | null;
    isManuallyModified?: boolean;
    taskTemplate: {
      title: string;
      category: string | null;
      room?: string | null;
      estimatedMinutes: number;
      color: string;
      isCollective?: boolean;
    };
    assignedMember: { id: string; displayName: string; color: string } | null;
    wasCompletedAlone?: boolean | null;
  };
  members: { id: string; displayName: string }[];
  currentMemberId?: string | null;
  compact?: boolean;
  returnTo?: string;
  householdId?: string;
  canEditTemplate?: boolean;
  taskTemplateId?: string;
};

function getStatusMeta(status: string) {
  if (status === "completed") {
    return { label: "Terminée", hint: "Déjà faite", icon: CheckCircle2, accent: "#064e3b", surface: "rgba(6, 78, 59, 0.08)", border: "rgba(6, 78, 59, 0.2)" };
  }
  if (status === "skipped") {
    return { label: "Sautée", hint: "Mise de côté", icon: SkipForward, accent: "#374151", surface: "rgba(55, 65, 81, 0.06)", border: "rgba(55, 65, 81, 0.16)" };
  }
  if (status === "rescheduled") {
    return { label: "Reportée", hint: "Nouvelle date", icon: RotateCcw, accent: "#0c4a6e", surface: "rgba(12, 74, 110, 0.08)", border: "rgba(12, 74, 110, 0.2)" };
  }
  if (status === "overdue") {
    return { label: "En retard", hint: "À rattraper", icon: AlertCircle, accent: "#7f1d1d", surface: "rgba(127, 29, 29, 0.08)", border: "rgba(127, 29, 29, 0.22)" };
  }
  if (status === "due") {
    return { label: "Aujourd'hui", hint: "À faire maintenant", icon: Clock3, accent: "#78350f", surface: "rgba(120, 53, 15, 0.08)", border: "rgba(120, 53, 15, 0.2)" };
  }
  return { label: "À faire", hint: "Prévue à venir", icon: CircleDashed, accent: "var(--ink-700)", surface: "rgba(30,31,34,0.04)", border: "rgba(30,31,34,0.1)" };
}

export function OccurrenceCard({
  occurrence,
  members,
  currentMemberId,
  compact = false,
  returnTo,
  householdId,
  canEditTemplate = false,
  taskTemplateId,
}: OccurrenceCardProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState(occurrence.status);
  const [showSheet, setShowSheet] = useState(false);

  const currentStatus = optimisticStatus;
  const canEditOccurrence = currentStatus !== "cancelled";
  const archived = ["completed", "skipped", "cancelled"].includes(currentStatus);
  const meta = getStatusMeta(currentStatus);
  const StatusIcon = meta.icon;
  const scheduledDate =
    occurrence.scheduledDate instanceof Date ? occurrence.scheduledDate : new Date(occurrence.scheduledDate);

  function stopEvent<T extends SyntheticEvent>(event: T) {
    event.stopPropagation();
  }

  async function submitAction(url: string, body?: Record<string, string>) {
    if (isSubmitting) return;

    const prevStatus = optimisticStatus;
    if (url.endsWith("/complete")) setOptimisticStatus("completed");
    else if (url.endsWith("/skip")) setOptimisticStatus("skipped");
    else if (url.endsWith("/reopen")) setOptimisticStatus("planned");

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("memberId", currentMemberId ?? "");
      if (returnTo) formData.set("nextPath", returnTo);
      if (body) {
        for (const [key, value] of Object.entries(body)) {
          formData.set(key, value);
        }
      }

      const csrfToken = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/)?.[1] ?? "";
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "x-requested-with": "fetch",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      success("Action enregistrée");
      router.refresh();
      setShowSheet(false);
    } catch {
      setOptimisticStatus(prevStatus);
      showError("Impossible d'effectuer cette action.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const cardBg = { borderColor: meta.border, background: `linear-gradient(135deg, ${meta.surface}, var(--card-end))` };

  return (
    <>
      <article
        className="relative overflow-hidden rounded-2xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] sm:rounded-[1.7rem] sm:p-5"
        onClick={() => setShowSheet(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setShowSheet(true);
          }
        }}
        role="button"
        style={cardBg}
        tabIndex={0}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 sm:h-1.5"
          style={{ backgroundColor: meta.accent }}
        />

        <div className="flex items-start gap-3 pt-1">
          <span
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full sm:size-10"
            style={{ backgroundColor: meta.surface, color: meta.accent, border: `1px solid ${meta.border}` }}
          >
            <StatusIcon className="size-4 sm:size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold leading-tight sm:text-lg">
                  {occurrence.taskTemplate.title}
                  {occurrence.taskTemplate.isCollective && !archived ? (
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-[rgba(47,109,136,0.12)] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-[var(--sky-600)]">
                      Coll.
                    </span>
                  ) : null}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-700)]">
                  {occurrence.taskTemplate.room ? (
                    <span className="rounded-full bg-white/80 border border-[var(--line)] px-2 py-0.5 font-medium">
                      {occurrence.taskTemplate.room}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-white/80 border border-[var(--line)] px-2 py-0.5 font-medium">
                    {formatMinutes(occurrence.taskTemplate.estimatedMinutes)}
                  </span>
                  {occurrence.actualMinutes !== null ? (
                    <span className="rounded-full bg-white/80 border border-[var(--line)] px-2 py-0.5 font-medium">
                      Réel {formatMinutes(occurrence.actualMinutes)}
                    </span>
                  ) : null}
                  {occurrence.assignedMember ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-[var(--line)] px-2 py-0.5 font-medium">
                      <span className="size-2 rounded-full" style={{ backgroundColor: occurrence.assignedMember.color }} />
                      {occurrence.assignedMember.displayName}
                    </span>
                  ) : null}
                  <span className="font-semibold" style={{ color: meta.accent }}>
                    {meta.label}
                  </span>
                </div>
              </div>

              <span className="shrink-0 rounded-lg bg-white/80 border border-[var(--line)] px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--ink-500)]">
                {format(scheduledDate, "d MMM", { locale: fr })}
              </span>
            </div>

            {occurrence.notes && !compact ? (
              <p className="mt-2 text-xs leading-5 text-[var(--ink-600)] sm:text-sm">{occurrence.notes}</p>
            ) : null}

            {occurrence.isManuallyModified && !compact ? (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[rgba(216,100,61,0.08)] px-2 py-1 text-[0.65rem] font-semibold text-[var(--coral-600)]">
                <AlertCircle className="size-3" />
                Date déplacée manuellement
              </div>
            ) : null}
          </div>
        </div>

        {!compact && canEditOccurrence && !archived ? (
          <div className="mt-3 flex items-center gap-2 pt-1">
            <button
              aria-label={`Marquer "${occurrence.taskTemplate.title}" comme terminée`}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(56,115,93,0.16)] bg-[rgba(56,115,93,0.1)] px-3 py-3 text-xs font-bold text-[var(--leaf-600)] transition-all active:scale-[0.97] disabled:opacity-40 sm:text-sm"
              disabled={isSubmitting}
              onClick={(event) => {
                stopEvent(event);
                submitAction(`/api/occurrences/${occurrence.id}/complete`);
              }}
              type="button"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <span>Terminer</span>
            </button>

            <button
              aria-label={`Passer "${occurrence.taskTemplate.title}"`}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-white/50 px-3 py-3 text-xs font-bold text-[var(--ink-700)] transition-all active:scale-[0.97] disabled:opacity-40 sm:text-sm"
              disabled={isSubmitting}
              onClick={(event) => {
                stopEvent(event);
                submitAction(`/api/occurrences/${occurrence.id}/skip`);
              }}
              type="button"
            >
              <SkipForward className="size-4" aria-hidden="true" />
              <span>Passer</span>
            </button>

            <button
              aria-label={`Plus d'actions pour ${occurrence.taskTemplate.title}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-white/50 text-[var(--ink-500)] transition-all active:scale-90"
              onClick={(event) => {
                stopEvent(event);
                setShowSheet(true);
              }}
              type="button"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        ) : null}

        {!compact && canEditOccurrence && archived ? (
          <div className="mt-3 flex items-center gap-2 pt-1">
            <button
              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[rgba(47,109,136,0.16)] bg-[rgba(47,109,136,0.08)] px-3 py-3 text-xs font-bold text-[var(--sky-600)] transition-all active:scale-[0.97] disabled:opacity-40 sm:text-sm"
              disabled={isSubmitting}
              onClick={(event) => {
                stopEvent(event);
                submitAction(`/api/occurrences/${occurrence.id}/reopen`);
              }}
              type="button"
            >
              <RotateCcw className="size-4" />
              <span>Remettre à faire</span>
            </button>
            <button
              aria-label={`Plus d'actions pour ${occurrence.taskTemplate.title}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-white/50 text-[var(--ink-500)] transition-all active:scale-90"
              onClick={(event) => {
                stopEvent(event);
                setShowSheet(true);
              }}
              type="button"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        ) : null}
      </article>

      <TaskDetailSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        occurrence={occurrence}
        members={members}
        currentMemberId={currentMemberId}
        householdId={householdId}
        canEditTemplate={canEditTemplate}
        taskTemplateId={taskTemplateId}
        archived={archived}
        canEditOccurrence={canEditOccurrence}
        statusLabel={meta.label}
        isSubmitting={isSubmitting}
        onSubmit={submitAction}
        onTemplateSaved={() => router.refresh()}
      />
    </>
  );
}
