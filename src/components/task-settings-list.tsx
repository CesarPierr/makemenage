"use client";

import Link from "next/link";
import { useState } from "react";
import { describeRecurrence } from "@/lib/scheduling/recurrence";
import { hexToRgba } from "@/lib/colors";
import { taskPalette } from "@/lib/constants";
import { Dialog } from "@/components/ui/dialog";

type Task = {
  id: string;
  title: string;
  estimatedMinutes: number;
  category: string | null;
  room: string | null;
  color: string | null;
  startsOn: Date | string;
  recurrenceRule: {
    type: "daily" | "every_x_days" | "weekly" | "every_x_weeks" | "monthly_simple";
    interval: number;
    weekdays: unknown;
    dayOfMonth: number | null;
    anchorDate: Date;
    dueOffsetDays: number;
  };
  assignmentRule: {
    mode:
      | "fixed"
      | "manual"
      | "strict_alternation"
      | "round_robin"
      | "least_assigned_count"
      | "least_assigned_minutes";
    eligibleMemberIds: unknown;
  };
};

const assignmentLabels: Record<string, { label: string; description: string }> = {
  fixed: {
    label: "Fixe",
    description: "Toujours la meme personne.",
  },
  manual: {
    label: "Manuelle",
    description: "Aucune auto-assignation, choix manuel sur chaque occurrence.",
  },
  strict_alternation: {
    label: "Alternance stricte",
    description: "Tour de role strict, en suivant l'ordre des membres eligibles.",
  },
  round_robin: {
    label: "Round-robin",
    description: "Distribution circulaire reguliere selon l'ordre de rotation.",
  },
  least_assigned_count: {
    label: "Charge (nombre)",
    description: "Priorite au membre ayant le moins de taches assignees.",
  },
  least_assigned_minutes: {
    label: "Charge (minutes)",
    description: "Priorite au membre ayant le moins de minutes assignees.",
  },
};

export function TaskSettingsList({
  tasks,
  householdId,
  manualOverridesByTaskId,
}: {
  tasks: Task[];
  householdId: string;
  manualOverridesByTaskId: Record<string, number>;
}) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const manualOverrideCountForDelete = deletingTask ? (manualOverridesByTaskId[deletingTask.id] ?? 0) : 0;

  return (
    <div className="mt-5 space-y-3">
      {tasks.length === 0 && (
        <p className="text-[var(--ink-700)]">Aucune tâche configurée.</p>
      )}

      {/* Edit Task Dialog */}
      <Dialog
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Modifier la tâche"
      >
        {editingTask && (
          <form 
            action={`/api/tasks/${editingTask.id}`} 
            method="post" 
            className="compact-form-grid" 
            onSubmit={() => setTimeout(() => setEditingTask(null), 100)}
          >
            <input type="hidden" name="_method" value="PUT" />
            <input type="hidden" name="householdId" value={householdId} />
            
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field-label">
                <span>Titre</span>
                <input className="field" type="text" name="title" defaultValue={editingTask.title} required />
              </label>
              <label className="field-label">
                <span>Durée (min)</span>
                <input className="field" type="number" min="1" name="estimatedMinutes" defaultValue={editingTask.estimatedMinutes} required onFocus={(event) => event.currentTarget.select()} />
              </label>
              <label className="field-label">
                <span>Catégorie</span>
                <input className="field" type="text" name="category" defaultValue={editingTask.category || ""} />
              </label>
              <label className="field-label">
                <span>Pièce</span>
                <input className="field" type="text" name="room" defaultValue={editingTask.room || ""} />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-[var(--ink-950)]">Couleur</span>
              <div className="flex items-center gap-2">
                <input className="size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0" type="color" name="color" defaultValue={editingTask.color || taskPalette[0]} />
                <div className="flex flex-wrap gap-1.5">
                  {taskPalette.slice(0, 4).map((color) => (
                    <span
                      key={color}
                      className="size-5 rounded-full border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-4">
              <p className="text-sm font-bold text-[var(--ink-950)] uppercase tracking-wider">Planification</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field-label">
                  <span>Date de référence</span>
                  <input className="field" type="date" name="startsOn" defaultValue={new Date(editingTask.startsOn).toISOString().split("T")[0]} required />
                </label>
                <label className="field-label">
                  <span>Répétition</span>
                  <select className="field" name="recurrenceType" defaultValue={editingTask.recurrenceRule.type}>
                    <option value="daily">Tous les jours</option>
                    <option value="every_x_days">Tous les X jours</option>
                    <option value="weekly">Chaque semaine</option>
                    <option value="every_x_weeks">Toutes les X semaines</option>
                    <option value="monthly_simple">Chaque mois</option>
                  </select>
                </label>
                <label className="field-label">
                  <span>Intervalle (X)</span>
                  <input className="field" type="number" min="1" name="interval" defaultValue={editingTask.recurrenceRule.interval} required onFocus={(event) => event.currentTarget.select()} />
                </label>
                <label className="field-label">
                  <span>Attribution</span>
                  <select className="field" name="assignmentMode" defaultValue={editingTask.assignmentRule.mode}>
                    <option value="fixed">Fixe</option>
                    <option value="manual">Manuelle</option>
                    <option value="strict_alternation">Alternance</option>
                    <option value="round_robin">Round-robin</option>
                    <option value="least_assigned_count">Équité (nombre)</option>
                    <option value="least_assigned_minutes">Équité (minutes)</option>
                  </select>
                </label>
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <p className="text-sm font-bold text-[var(--ink-950)] uppercase tracking-wider">Options critiques</p>
              <label className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 cursor-pointer hover:bg-blue-100 transition-colors">
                <input name="forceOverwriteManual" type="checkbox" className="mt-1" />
                <span className="text-blue-900 text-sm leading-tight">
                  <strong>Réinitialiser les occurrences :</strong> Écraser les modifications manuelles existantes avec ces nouveaux réglages.
                </span>
              </label>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button className="btn-secondary px-5 py-2.5 font-semibold" type="button" onClick={() => setEditingTask(null)}>
                Annuler
              </button>
              <button className="btn-primary px-5 py-2.5 font-semibold" type="submit">
                Enregistrer
              </button>
            </div>
          </form>
        )}
      </Dialog>
      {tasks.map((task) => {
        const method = assignmentLabels[task.assignmentRule.mode] ?? {
          label: task.assignmentRule.mode.replace(/_/g, " "),
          description: "",
        };
        const manualOverrideCount = manualOverridesByTaskId[task.id] ?? 0;

        return (
        <article
          key={task.id}
          className="soft-panel p-4"
          style={{
            borderColor: hexToRgba(task.color ?? "#D8643D", 0.18),
            background: `linear-gradient(135deg, ${hexToRgba(task.color ?? "#D8643D", 0.1)}, rgba(255, 255, 255, 0.72))`,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ backgroundColor: task.color ?? "#D8643D" }} />
                <h4 className="text-lg font-semibold">{task.title}</h4>
              </div>
              <p className="text-sm text-[var(--ink-700)] mt-1">
                {describeRecurrence({
                  type: task.recurrenceRule.type,
                  interval: task.recurrenceRule.interval,
                  weekdays: Array.isArray(task.recurrenceRule.weekdays)
                    ? task.recurrenceRule.weekdays.map(Number)
                    : undefined,
                  dayOfMonth: task.recurrenceRule.dayOfMonth,
                  anchorDate: task.recurrenceRule.anchorDate,
                  dueOffsetDays: task.recurrenceRule.dueOffsetDays,
                })}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-700)]">
                {method.label} · {method.description}
              </p>
              {manualOverrideCount > 0 ? (
                <Link
                  className="mt-1 inline-flex items-center rounded-full border border-[rgba(216,100,61,0.16)] bg-[rgba(216,100,61,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--coral-600)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgba(216,100,61,0.14)] hover:shadow-[0_12px_24px_rgba(216,100,61,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(216,100,61,0.3)]"
                  href={`/app/my-tasks/overrides/${task.id}?household=${householdId}`}
                >
                  {manualOverrideCount} occurrence{manualOverrideCount > 1 ? "s" : ""} future{manualOverrideCount > 1 ? "s" : ""} modifiée{manualOverrideCount > 1 ? "s" : ""}
                </Link>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <span className="stat-pill px-3 py-1 text-sm">{method.label}</span>
              <button 
                onClick={() => setEditingTask(task)}
                className="text-sm font-semibold text-[var(--coral-600)] hover:underline"
              >
                Modifier
              </button>
              <button 
                onClick={() => setDeletingTask(task)}
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Supprimer
              </button>
            </div>
          </div>
        </article>
        );
      })}

      <Dialog
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        title={`Supprimer "${deletingTask?.title}" ?`}
        type="danger"
      >
        {deletingTask && (
          <form id="delete-form" action={`/api/tasks/${deletingTask.id}`} method="post" onSubmit={() => setTimeout(() => setDeletingTask(null), 100)}>
            <input type="hidden" name="_method" value="DELETE" />
            <input type="hidden" name="householdId" value={householdId} />
            
            {manualOverrideCountForDelete > 0 ? (
              <>
                <p className="text-[var(--ink-700)] mb-4 leading-relaxed">
                  <strong>Attention :</strong> {manualOverrideCountForDelete} occurrence{manualOverrideCountForDelete > 1 ? "s" : ""} future{manualOverrideCountForDelete > 1 ? "s" : ""} a{manualOverrideCountForDelete > 1 ? "ve" : ""}nt été modifiée{manualOverrideCountForDelete > 1 ? "s" : ""} manuellement. Souhaitez-vous également les supprimer ?
                </p>
                <label className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 cursor-pointer hover:bg-red-100 transition-colors">
                  <input name="deleteManual" type="checkbox" className="mt-1" />
                  <span className="text-red-900 font-medium">
                    Oui, annuler toutes les occurrences futures associées.
                  </span>
                </label>
              </>
            ) : (
              <p className="text-[var(--ink-700)] leading-relaxed">
                Cette tâche ne sera plus générée à l&apos;avenir. Ses occurrences passées seront conservées dans l&apos;historique.
              </p>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button className="btn-secondary px-5 py-2.5 font-semibold" type="button" onClick={() => setDeletingTask(null)}>
                Annuler
              </button>
              <button className="btn-primary bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 font-semibold border-none" type="submit">
                Confirmer la suppression
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
