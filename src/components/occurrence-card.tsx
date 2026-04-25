"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CircleDashed,
  Clock3,
  History,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Send,
  SkipForward,
  Users,
} from "lucide-react";

import { BottomSheet, BottomSheetAction } from "@/components/ui/bottom-sheet";
import { TemplateEditPanel, TaskHistoryPanel } from "@/components/task-detail-panels";
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
  const [showDetails, setShowDetails] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [showDetailedComplete, setShowDetailedComplete] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showTemplateEdit, setShowTemplateEdit] = useState(false);
  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [comments, setComments] = useState<{ id: string; body: string; authorName: string; createdAt: string }[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const commentsFetched = useRef(false);

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

  // Unified action handler with optimistic updates
  async function submitAction(url: string, body?: Record<string, string>) {
    if (isSubmitting) return;

    // Apply optimistic update for the most common actions
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
    } catch {
      setOptimisticStatus(prevStatus); // revert on error
      showError("Impossible d'effectuer cette action.");
    } finally {
      setIsSubmitting(false);
      setShowActions(false);
      setShowReschedule(false);
      setShowReassign(false);
      setShowDetailedComplete(false);
    }
  }

  // Lazily fetch comments when the sheet opens
  useEffect(() => {
    if (!showComments || commentsFetched.current) return;
    commentsFetched.current = true;
    fetch(`/api/occurrences/${occurrence.id}/comments`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setComments(data); })
      .catch(() => undefined);
  }, [showComments, occurrence.id]);

  async function postComment() {
    if (!commentBody.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const csrfToken = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/)?.[1] ?? "";
      const formData = new FormData();
      formData.set("body", commentBody.trim());
      if (currentMemberId) formData.set("memberId", currentMemberId);
      const res = await fetch(`/api/occurrences/${occurrence.id}/comments`, {
        method: "POST",
        body: formData,
        headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
      });
      if (!res.ok) throw new Error();
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setCommentBody("");
    } catch {
      showError("Impossible d'envoyer le commentaire.");
    } finally {
      setIsPostingComment(false);
    }
  }

  // Build card style based on status
  const cardBg = { borderColor: meta.border, background: `linear-gradient(135deg, ${meta.surface}, var(--card-end))` };

  return (
    <>
      <article
        className="relative overflow-hidden rounded-2xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] sm:rounded-[1.7rem] sm:p-5"
        onClick={() => setShowDetails(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setShowDetails(true);
          }
        }}
        role="button"
        style={cardBg}
        tabIndex={0}
      >
        {/* Status color bar - thin on mobile */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 sm:h-1.5"
          style={{ backgroundColor: meta.accent }}
        />

        {/* Main content row */}
        <div className="flex items-start gap-3 pt-1">
          {/* Status icon - compact */}
          <span
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full sm:size-10"
            style={{ backgroundColor: meta.surface, color: meta.accent, border: `1px solid ${meta.border}` }}
          >
            <StatusIcon className="size-4 sm:size-5" />
          </span>

          {/* Task info */}
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
                {/* Meta pills - single line on mobile */}
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

              {/* Date badge */}
              <span className="shrink-0 rounded-lg bg-white/80 border border-[var(--line)] px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--ink-500)]">
                {format(scheduledDate, "d MMM", { locale: fr })}
              </span>
            </div>

            {/* Notes */}
            {occurrence.notes && !compact ? (
              <p className="mt-2 text-xs leading-5 text-[var(--ink-600)] sm:text-sm">{occurrence.notes}</p>
            ) : null}

            {/* Manual modification warning */}
            {occurrence.isManuallyModified && !compact ? (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[rgba(216,100,61,0.08)] px-2 py-1 text-[0.65rem] font-semibold text-[var(--coral-600)]">
                <AlertCircle className="size-3" />
                Date déplacée manuellement
              </div>
            ) : null}
          </div>
        </div>

        {/* Action buttons - visible directly, no collapse needed */}
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
              aria-label={`Actions pour ${occurrence.taskTemplate.title}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-white/50 text-[var(--ink-500)] transition-all active:scale-90"
              onClick={(event) => {
                stopEvent(event);
                setShowActions(true);
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
              aria-label={`Actions pour ${occurrence.taskTemplate.title}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-white/50 text-[var(--ink-500)] transition-all active:scale-90"
              onClick={(event) => {
                stopEvent(event);
                setShowActions(true);
              }}
              type="button"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        ) : null}
      </article>

      <BottomSheet
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Cette tâche"
      >
        <div className="space-y-4">
          <div className="rounded-[1.3rem] border border-[var(--line)] bg-white/70 p-4">
            <p className="section-kicker">À faire</p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--ink-950)]">{occurrence.taskTemplate.title}</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--ink-700)]">
              {occurrence.taskTemplate.room ? <span className="stat-pill px-3 py-1 font-semibold">{occurrence.taskTemplate.room}</span> : null}
              <span className="stat-pill px-3 py-1 font-semibold">{formatMinutes(occurrence.taskTemplate.estimatedMinutes)}</span>
              <span className="stat-pill px-3 py-1 font-semibold">{meta.label}</span>
              {occurrence.assignedMember ? (
                <span className="stat-pill px-3 py-1 font-semibold">{occurrence.assignedMember.displayName}</span>
              ) : null}
              {occurrence.actualMinutes !== null ? (
                <span className="stat-pill px-3 py-1 font-semibold">Réel {formatMinutes(occurrence.actualMinutes)}</span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-700)]">
              Prévue pour le {format(scheduledDate, "EEEE d MMMM", { locale: fr })}.
            </p>
            {occurrence.notes ? (
              <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">{occurrence.notes}</p>
            ) : null}
            {occurrence.isManuallyModified ? (
              <p className="mt-2 text-sm font-medium text-[var(--coral-600)]">
                Cette tâche a déjà été ajustée à la main.
              </p>
            ) : null}
          </div>

          {canEditOccurrence ? (
            <div className="grid gap-2">
              {!archived ? (
                <>
                  <button
                    className="btn-primary w-full px-4 py-3 text-sm font-semibold"
                    disabled={isSubmitting}
                    onClick={() => {
                      setShowDetails(false);
                      submitAction(`/api/occurrences/${occurrence.id}/complete`);
                    }}
                    type="button"
                  >
                    Terminer
                  </button>
                  <button
                    className="btn-secondary w-full px-4 py-3 text-sm font-semibold"
                    disabled={isSubmitting}
                    onClick={() => {
                      setShowDetails(false);
                      setShowDetailedComplete(true);
                    }}
                    type="button"
                  >
                    Terminer avec détails
                  </button>
                  <button
                    className="btn-quiet w-full px-4 py-3 text-sm font-semibold"
                    disabled={isSubmitting}
                    onClick={() => {
                      setShowDetails(false);
                      setShowReschedule(true);
                    }}
                    type="button"
                  >
                    Faire plus tard
                  </button>
                </>
              ) : (
                <button
                  className="btn-secondary w-full px-4 py-3 text-sm font-semibold"
                  disabled={isSubmitting}
                  onClick={() => {
                    setShowDetails(false);
                    submitAction(`/api/occurrences/${occurrence.id}/reopen`);
                  }}
                  type="button"
                >
                  Remettre à faire
                </button>
              )}
            </div>
          ) : null}

          <div className="space-y-1">
            <BottomSheetAction
              icon={Users}
              label="Changer la personne"
              hint="Confier cette tâche à quelqu’un d’autre"
              onClick={() => {
                setShowDetails(false);
                setShowReassign(true);
              }}
            />
            <BottomSheetAction
              icon={MessageSquare}
              label="Commentaires"
              hint="Voir ou ajouter un message"
              onClick={() => {
                setShowDetails(false);
                setShowComments(true);
              }}
            />
            {canEditTemplate && householdId && taskTemplateId ? (
              <BottomSheetAction
                icon={Pencil}
                label="Modifier le modèle"
                hint="Changer la récurrence, le titre, l'attribution"
                onClick={() => {
                  setShowDetails(false);
                  setShowTemplateEdit(true);
                }}
              />
            ) : null}
            {taskTemplateId ? (
              <BottomSheetAction
                icon={History}
                label="Historique de la tâche"
                hint="Les dernières exécutions"
                onClick={() => {
                  setShowDetails(false);
                  setShowTaskHistory(true);
                }}
              />
            ) : null}
            <BottomSheetAction
              icon={MoreHorizontal}
              label="Plus d'actions"
              hint="Voir les options avancées"
              onClick={() => {
                setShowDetails(false);
                setShowActions(true);
              }}
            />
          </div>
        </div>
      </BottomSheet>

      {/* Bottom Sheet: More Actions */}
      <BottomSheet
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        title={occurrence.taskTemplate.title}
      >
        <div className="space-y-1">
          <BottomSheetAction
            icon={CheckCircle2}
            label="Terminer avec détails"
            hint="Ajouter minutes réelles, note, options"
            onClick={() => { setShowActions(false); setShowDetailedComplete(true); }}
            variant="success"
          />
          <BottomSheetAction
            icon={Calendar}
            label="Faire plus tard"
            hint="Choisir une nouvelle date"
            onClick={() => { setShowActions(false); setShowReschedule(true); }}
          />
          <BottomSheetAction
            icon={Users}
            label="Changer la personne"
            hint="Confier cette tâche à un autre membre"
            onClick={() => { setShowActions(false); setShowReassign(true); }}
          />
          <BottomSheetAction
            icon={SkipForward}
            label="Passer avec une note"
            hint="Ne pas la faire cette fois, avec explication"
            onClick={() => {
              const note = window.prompt("Raison du saut (facultatif):");
              if (note !== null) {
                setShowActions(false);
                submitAction(`/api/occurrences/${occurrence.id}/skip`, { notes: note });
              }
            }}
          />
          <BottomSheetAction
            icon={MessageSquare}
            label="Commentaires"
            hint="Voir et ajouter des commentaires"
            onClick={() => { setShowActions(false); setShowComments(true); }}
          />
          {canEditTemplate && householdId && taskTemplateId ? (
            <BottomSheetAction
              icon={Pencil}
              label="Modifier le modèle"
              hint="Changer la récurrence, le titre, l'attribution, la durée"
              onClick={() => {
                setShowActions(false);
                setShowTemplateEdit(true);
              }}
            />
          ) : null}
          {taskTemplateId ? (
            <BottomSheetAction
              icon={History}
              label="Historique de la tâche"
              hint="Voir les dernières exécutions"
              onClick={() => {
                setShowActions(false);
                setShowTaskHistory(true);
              }}
            />
          ) : null}
          {(archived || occurrence.status === "rescheduled") ? (
            <BottomSheetAction
              icon={RotateCcw}
              label="Remettre à faire"
              hint="Revenir à l'état actif"
              onClick={() => {
                setShowActions(false);
                submitAction(`/api/occurrences/${occurrence.id}/reopen`);
              }}
            />
          ) : null}
        </div>
      </BottomSheet>

      {/* Bottom Sheet: Reschedule */}
      <BottomSheet
        isOpen={showReschedule}
        onClose={() => setShowReschedule(false)}
        title="Faire plus tard"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const date = formData.get("date") as string;
            if (date) submitAction(`/api/occurrences/${occurrence.id}/reschedule`, { date });
          }}
        >
          <label className="field-label">
            <span>Nouvelle date</span>
            <input className="field" name="date" required type="date" />
          </label>
          <button
            className="btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            Changer la date
          </button>
        </form>
      </BottomSheet>

      {/* Bottom Sheet: Reassign */}
      <BottomSheet
        isOpen={showReassign}
        onClose={() => setShowReassign(false)}
        title="Changer la personne"
      >
        <div className="space-y-2">
          {members.map((member) => (
            <button
              key={member.id}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all hover:bg-black/[0.04] active:scale-[0.98]"
              disabled={isSubmitting}
              onClick={() => submitAction(`/api/occurrences/${occurrence.id}/reassign`, { assignedMemberId: member.id })}
              type="button"
            >
              {member.displayName}
              {occurrence.assignedMember?.id === member.id ? (
                <span className="ml-auto rounded-full bg-[var(--leaf-500)] px-2 py-0.5 text-[0.6rem] font-bold text-white">Actuel</span>
              ) : null}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Bottom Sheet: Comments */}
      <BottomSheet
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        title="Commentaires"
      >
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-center text-sm text-[var(--ink-500)]">Aucun commentaire pour l&apos;instant.</p>
          ) : (
            <ul aria-live="polite" className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2.5">
                  <p className="text-xs font-semibold text-[var(--ink-700)]">{c.authorName}</p>
                  <p className="mt-0.5 text-sm">{c.body}</p>
                  <p className="mt-1 text-[0.6rem] text-[var(--ink-400)]">{format(new Date(c.createdAt), "d MMM HH:mm", { locale: fr })}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 pt-1">
            <input
              aria-label="Nouveau commentaire"
              className="field flex-1 text-sm"
              onChange={(e) => setCommentBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); }}}
              placeholder="Ajouter un commentaire…"
              type="text"
              value={commentBody}
            />
            <button
              aria-label="Envoyer le commentaire"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--coral-500)] text-white disabled:opacity-40"
              disabled={!commentBody.trim() || isPostingComment}
              onClick={postComment}
              type="button"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Bottom Sheet: Detailed Complete */}
      <BottomSheet
        isOpen={showDetailedComplete}
        onClose={() => setShowDetailedComplete(false)}
        title="Terminer avec détails"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const body: Record<string, string> = {};
            const actualMinutes = formData.get("actualMinutes") as string;
            const notes = formData.get("notes") as string;
            const shiftFuture = formData.get("shiftFutureOccurrences");
            const wasAlone = formData.get("wasCompletedAlone");
            if (actualMinutes) body.actualMinutes = actualMinutes;
            if (notes) body.notes = notes;
            if (shiftFuture) body.shiftFutureOccurrences = "on";
            if (wasAlone) body.wasCompletedAlone = "on";
            submitAction(`/api/occurrences/${occurrence.id}/complete`, body);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field-label">
              <span>Minutes réelles</span>
              <input
                className="field"
                defaultValue={occurrence.actualMinutes ?? ""}
                min="0"
                name="actualMinutes"
                placeholder="Ex: 15"
                type="number"
              />
            </label>
            <label className="field-label">
              <span>Note</span>
              <input
                className="field"
                defaultValue={occurrence.notes ?? ""}
                name="notes"
                placeholder="Optionnel"
                type="text"
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2.5 text-xs font-medium text-[var(--ink-700)]">
            <input name="shiftFutureOccurrences" type="checkbox" />
            Décaler les prochaines occurrences (si validation en avance)
          </label>
          {occurrence.taskTemplate.isCollective ? (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2.5 text-xs font-medium text-[var(--ink-700)]">
              <input name="wasCompletedAlone" type="checkbox" />
              J&apos;ai fait cette tâche collective seul(e)
            </label>
          ) : null}
          <button
            className="btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            Enregistrer
          </button>
        </form>
      </BottomSheet>

      {/* Bottom Sheet: Inline Template Edit */}
      {canEditTemplate && householdId && taskTemplateId ? (
        <BottomSheet
          isOpen={showTemplateEdit}
          onClose={() => setShowTemplateEdit(false)}
          title="Modifier le modèle"
        >
          <TemplateEditPanel
            taskId={taskTemplateId}
            householdId={householdId}
            open={showTemplateEdit}
            onCancel={() => setShowTemplateEdit(false)}
            onSuccess={() => {
              setShowTemplateEdit(false);
              router.refresh();
            }}
          />
        </BottomSheet>
      ) : null}

      {/* Bottom Sheet: Task History */}
      {taskTemplateId ? (
        <BottomSheet
          isOpen={showTaskHistory}
          onClose={() => setShowTaskHistory(false)}
          title="Historique de la tâche"
        >
          <TaskHistoryPanel taskId={taskTemplateId} open={showTaskHistory} />
        </BottomSheet>
      ) : null}
    </>
  );
}
