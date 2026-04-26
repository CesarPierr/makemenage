"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Coffee,
  History,
  MessageSquare,
  Pencil,
  RotateCcw,
  Send,
  SkipForward,
  Sunrise,
  Users,
} from "lucide-react";

import { TaskHistoryPanel, TemplateEditPanel } from "@/components/task-detail-panels";
import { BottomSheet, BottomSheetAction } from "@/components/ui/bottom-sheet";
import { useToast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/relative-date";
import { formatMinutes } from "@/lib/utils";

type TabId = "occurrence" | "template" | "history" | "comments";
type Mode = "main" | "complete-details" | "reschedule" | "reassign" | "skip-note";

type Comment = { id: string; body: string; authorName: string; createdAt: string };

type Occurrence = {
  id: string;
  scheduledDate: Date | string;
  status: string;
  notes: string | null;
  actualMinutes: number | null;
  isManuallyModified?: boolean;
  taskTemplate: {
    title: string;
    room?: string | null;
    estimatedMinutes: number;
    isCollective?: boolean;
  };
  assignedMember: { id: string; displayName: string } | null;
};

export type TaskDetailSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  occurrence: Occurrence;
  members: { id: string; displayName: string }[];
  currentMemberId?: string | null;
  householdId?: string;
  canEditTemplate?: boolean;
  taskTemplateId?: string;
  archived: boolean;
  canEditOccurrence: boolean;
  statusLabel: string;
  isSubmitting: boolean;
  onSubmit: (url: string, body?: Record<string, string>) => Promise<void>;
  onTemplateSaved?: () => void;
};

export function TaskDetailSheet({
  isOpen,
  onClose,
  occurrence,
  members,
  currentMemberId,
  householdId,
  canEditTemplate = false,
  taskTemplateId,
  archived,
  canEditOccurrence,
  statusLabel,
  isSubmitting,
  onSubmit,
  onTemplateSaved,
}: TaskDetailSheetProps) {
  const { error: showError } = useToast();
  const [tab, setTab] = useState<TabId>("occurrence");
  const [mode, setMode] = useState<Mode>("main");

  // Comments state lives here when the tab is opened
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const commentsFetched = useRef(false);

  useEffect(() => {
    if (tab !== "comments" || commentsFetched.current) return;
    commentsFetched.current = true;
    fetch(`/api/occurrences/${occurrence.id}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setComments(data);
      })
      .catch(() => undefined);
  }, [tab, occurrence.id]);

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
      const newComment = (await res.json()) as Comment;
      setComments((prev) => [...prev, newComment]);
      setCommentBody("");
    } catch {
      showError("Impossible d'envoyer le commentaire.");
    } finally {
      setIsPostingComment(false);
    }
  }

  const scheduledDate =
    occurrence.scheduledDate instanceof Date ? occurrence.scheduledDate : new Date(occurrence.scheduledDate);

  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: "occurrence", label: "Cette fois-ci", show: true },
    { id: "template", label: "Modèle", show: Boolean(canEditTemplate && householdId && taskTemplateId) },
    { id: "history", label: "Historique", show: Boolean(taskTemplateId) },
    { id: "comments", label: "Commentaires", show: true },
  ];

  function backToMain() {
    setMode("main");
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={occurrence.taskTemplate.title}>
      <div className="space-y-4">
        {/* Tabs */}
        <div role="tablist" aria-label="Sections de la tâche" className="flex gap-1 overflow-x-auto rounded-full border border-[var(--line)] bg-[rgba(30,31,34,0.04)] p-1">
          {tabs.filter((t) => t.show).map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              type="button"
              className={
                tab === t.id
                  ? "shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[var(--ink-950)] shadow-sm"
                  : "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold text-[var(--ink-500)]"
              }
              onClick={() => {
                setTab(t.id);
                setMode("main");
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "occurrence" ? (
          <div className="space-y-3">
            {/* Summary */}
            <div className="rounded-[1.3rem] border border-[var(--line)] bg-white/70 p-4">
              <p className="section-kicker">À faire</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--ink-950)]">{occurrence.taskTemplate.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--ink-700)]">
                {occurrence.taskTemplate.room ? (
                  <span className="stat-pill px-3 py-1 font-semibold">{occurrence.taskTemplate.room}</span>
                ) : null}
                <span className="stat-pill px-3 py-1 font-semibold">
                  {formatMinutes(occurrence.taskTemplate.estimatedMinutes)}
                </span>
                <span className="stat-pill px-3 py-1 font-semibold">{statusLabel}</span>
                {occurrence.assignedMember ? (
                  <span className="stat-pill px-3 py-1 font-semibold">{occurrence.assignedMember.displayName}</span>
                ) : null}
                {occurrence.actualMinutes !== null ? (
                  <span className="stat-pill px-3 py-1 font-semibold">
                    Réel {formatMinutes(occurrence.actualMinutes)}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-700)]">
                Prévue {formatRelative(scheduledDate, { style: "long" })}{" "}
                <span className="text-[var(--ink-500)]">
                  ({format(scheduledDate, "EEEE d MMMM", { locale: fr })})
                </span>
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

            {/* Mode body */}
            {mode === "main" ? (
              <div className="space-y-2">
                {canEditOccurrence && !archived ? (
                  <>
                    <button
                      className="btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-50"
                      disabled={isSubmitting}
                      onClick={() => onSubmit(`/api/occurrences/${occurrence.id}/complete`)}
                      type="button"
                    >
                      Terminer
                    </button>
                    <BottomSheetAction
                      icon={CheckCircle2}
                      label="Terminer avec détails"
                      hint="Minutes réelles, note, options"
                      variant="success"
                      onClick={() => setMode("complete-details")}
                    />
                    <BottomSheetAction
                      icon={Calendar}
                      label="Faire plus tard"
                      hint="Choisir une nouvelle date"
                      onClick={() => setMode("reschedule")}
                    />
                    <BottomSheetAction
                      icon={Users}
                      label="Changer la personne"
                      hint="Confier à quelqu'un d'autre"
                      onClick={() => setMode("reassign")}
                    />
                    <BottomSheetAction
                      icon={SkipForward}
                      label="Passer avec une note"
                      hint="Ne pas la faire cette fois"
                      onClick={() => setMode("skip-note")}
                    />
                  </>
                ) : null}

                {canEditOccurrence && archived ? (
                  <button
                    className="btn-secondary w-full px-4 py-3 text-sm font-semibold disabled:opacity-50"
                    disabled={isSubmitting}
                    onClick={() => onSubmit(`/api/occurrences/${occurrence.id}/reopen`)}
                    type="button"
                  >
                    <RotateCcw className="mr-2 inline size-4" />
                    Remettre à faire
                  </button>
                ) : null}

                {canEditTemplate && householdId && taskTemplateId ? (
                  <BottomSheetAction
                    icon={Pencil}
                    label="Modifier le modèle"
                    hint="Récurrence, titre, attribution"
                    onClick={() => setTab("template")}
                  />
                ) : null}
                {taskTemplateId ? (
                  <BottomSheetAction
                    icon={History}
                    label="Historique de la tâche"
                    hint="Les dernières exécutions"
                    onClick={() => setTab("history")}
                  />
                ) : null}
                <BottomSheetAction
                  icon={MessageSquare}
                  label="Commentaires"
                  hint="Voir ou ajouter un message"
                  onClick={() => setTab("comments")}
                />
              </div>
            ) : null}

            {mode === "complete-details" ? (
              <form
                className="space-y-3 rounded-[1.3rem] border border-[var(--line)] bg-white/70 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const body: Record<string, string> = {};
                  const actualMinutes = formData.get("actualMinutes") as string;
                  const notes = formData.get("notes") as string;
                  if (actualMinutes) body.actualMinutes = actualMinutes;
                  if (notes) body.notes = notes;
                  if (formData.get("wasCompletedAlone")) body.wasCompletedAlone = "on";
                  onSubmit(`/api/occurrences/${occurrence.id}/complete`, body);
                }}
              >
                <button type="button" onClick={backToMain} className="text-xs font-semibold text-[var(--ink-500)] inline-flex items-center gap-1">
                  <ArrowLeft className="size-3.5" /> Retour
                </button>
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
                <p className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2.5 text-xs leading-5 text-[var(--ink-500)]">
                  Le calendrier suivant est automatiquement réaligné depuis aujourd&apos;hui.
                </p>
                {occurrence.taskTemplate.isCollective ? (
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2.5 text-xs font-medium text-[var(--ink-700)]">
                    <input name="wasCompletedAlone" type="checkbox" />
                    J&apos;ai fait cette tâche collective seul(e)
                  </label>
                ) : null}
                <button className="btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-50" disabled={isSubmitting} type="submit">
                  Enregistrer
                </button>
              </form>
            ) : null}

            {mode === "reschedule" ? (
              <div className="space-y-3 rounded-[1.3rem] border border-[var(--line)] bg-white/70 p-4">
                <button type="button" onClick={backToMain} className="text-xs font-semibold text-[var(--ink-500)] inline-flex items-center gap-1">
                  <ArrowLeft className="size-3.5" /> Retour
                </button>

                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-500)]">
                  Reporter rapidement à
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([
                    { id: "tomorrow", label: "Demain", icon: Sunrise },
                    { id: "after-tomorrow", label: "Après-demain", icon: null },
                    { id: "weekend", label: "Week-end", icon: Coffee },
                  ] as const).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2.5 text-sm font-semibold text-[var(--ink-700)] transition-all hover:bg-white active:scale-[0.98] disabled:opacity-40"
                      disabled={isSubmitting}
                      onClick={() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const date = new Date(today);
                        if (id === "tomorrow") {
                          date.setDate(date.getDate() + 1);
                        } else if (id === "after-tomorrow") {
                          date.setDate(date.getDate() + 2);
                        } else {
                          const dayOfWeek = today.getDay();
                          const daysUntilSat = ((6 - dayOfWeek + 7) % 7) || 7;
                          date.setDate(date.getDate() + daysUntilSat);
                        }
                        const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                        onSubmit(`/api/occurrences/${occurrence.id}/reschedule`, { date: iso });
                      }}
                      type="button"
                    >
                      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
                      {label}
                    </button>
                  ))}
                </div>

                <form
                  className="space-y-2 pt-2 border-t border-[var(--line)]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const date = formData.get("date") as string;
                    if (date) onSubmit(`/api/occurrences/${occurrence.id}/reschedule`, { date });
                  }}
                >
                  <label className="field-label">
                    <span>Ou choisissez une date</span>
                    <input className="field" name="date" required type="date" />
                  </label>
                  <button className="btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-50" disabled={isSubmitting} type="submit">
                    Changer la date
                  </button>
                </form>
              </div>
            ) : null}

            {mode === "reassign" ? (
              <div className="space-y-2 rounded-[1.3rem] border border-[var(--line)] bg-white/70 p-4">
                <button type="button" onClick={backToMain} className="text-xs font-semibold text-[var(--ink-500)] inline-flex items-center gap-1">
                  <ArrowLeft className="size-3.5" /> Retour
                </button>
                {members.map((member) => (
                  <button
                    key={member.id}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left text-sm font-semibold transition-all hover:bg-black/[0.04] active:scale-[0.98] disabled:opacity-50"
                    disabled={isSubmitting}
                    onClick={() => onSubmit(`/api/occurrences/${occurrence.id}/reassign`, { assignedMemberId: member.id })}
                    type="button"
                  >
                    {member.displayName}
                    {occurrence.assignedMember?.id === member.id ? (
                      <span className="ml-auto rounded-full bg-[var(--leaf-500)] px-2 py-0.5 text-[0.6rem] font-bold text-white">Actuel</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {mode === "skip-note" ? (
              <form
                className="space-y-3 rounded-[1.3rem] border border-[var(--line)] bg-white/70 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const notes = (formData.get("notes") as string) ?? "";
                  onSubmit(`/api/occurrences/${occurrence.id}/skip`, notes ? { notes } : undefined);
                }}
              >
                <button type="button" onClick={backToMain} className="text-xs font-semibold text-[var(--ink-500)] inline-flex items-center gap-1">
                  <ArrowLeft className="size-3.5" /> Retour
                </button>
                <label className="field-label">
                  <span>Raison (facultatif)</span>
                  <input className="field" name="notes" placeholder="Pourquoi sauter ?" type="text" />
                </label>
                <button className="btn-primary w-full px-4 py-3 text-sm font-semibold disabled:opacity-50" disabled={isSubmitting} type="submit">
                  Passer cette tâche
                </button>
              </form>
            ) : null}
          </div>
        ) : null}

        {tab === "template" && canEditTemplate && householdId && taskTemplateId ? (
          <TemplateEditPanel
            taskId={taskTemplateId}
            householdId={householdId}
            open={isOpen && tab === "template"}
            onCancel={() => setTab("occurrence")}
            onSuccess={() => {
              setTab("occurrence");
              onTemplateSaved?.();
            }}
          />
        ) : null}

        {tab === "history" && taskTemplateId ? (
          <TaskHistoryPanel taskId={taskTemplateId} open={isOpen && tab === "history"} />
        ) : null}

        {tab === "comments" ? (
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-center text-sm text-[var(--ink-500)]">Aucun commentaire pour l&apos;instant.</p>
            ) : (
              <ul aria-live="polite" className="space-y-2">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2.5">
                    <p className="text-xs font-semibold text-[var(--ink-700)]">{c.authorName}</p>
                    <p className="mt-0.5 text-sm">{c.body}</p>
                    <p className="mt-1 text-[0.6rem] text-[var(--ink-400)]">
                      {format(new Date(c.createdAt), "d MMM HH:mm", { locale: fr })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 pt-1">
              <input
                aria-label="Nouveau commentaire"
                className="field flex-1 text-sm"
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    postComment();
                  }
                }}
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
        ) : null}
      </div>
    </BottomSheet>
  );
}
