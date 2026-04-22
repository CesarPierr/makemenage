"use client";

import { useState } from "react";
import { describeRecurrence } from "@/lib/scheduling/recurrence";
import { hexToRgba } from "@/lib/colors";
import { taskPalette } from "@/lib/constants";

type Member = { id: string; displayName: string };
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

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

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
  members,
  householdId,
  manualOverridesByTaskId,
}: {
  tasks: Task[];
  members: Member[];
  householdId: string;
  manualOverridesByTaskId: Record<string, number>;
}) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  if (editingTask) {
    const selectedMemberIds = toStringArray(editingTask.assignmentRule.eligibleMemberIds);

    return (
      <div className="soft-panel p-4">
        <h4 className="text-xl font-semibold mb-4">Modifier la tâche</h4>
        <form action={`/api/tasks/${editingTask.id}`} method="post" className="compact-form-grid" onSubmit={() => setTimeout(() => setEditingTask(null), 100)}>
          <input type="hidden" name="_method" value="PUT" />
          <input type="hidden" name="householdId" value={householdId} />
          
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field-label">
              <span>Titre</span>
              <input className="field" type="text" name="title" defaultValue={editingTask.title} required />
            </label>
            <label className="field-label">
              <span>Durée estimée (min)</span>
              <input className="field" type="number" min="5" name="estimatedMinutes" defaultValue={editingTask.estimatedMinutes} required />
            </label>
            <label className="field-label">
              <span>Catégorie</span>
              <input className="field" type="text" name="category" defaultValue={editingTask.category || ""} />
            </label>
            <label className="field-label">
              <span>Pièce</span>
              <input className="field" type="text" name="room" defaultValue={editingTask.room || ""} />
            </label>
            <label className="field-label">
              <span>Couleur</span>
              <div className="flex items-center gap-3">
                <input className="field h-[3.2rem] px-2" type="color" name="color" defaultValue={editingTask.color || taskPalette[0]} />
                <div className="flex flex-wrap gap-2">
                  {taskPalette.slice(0, 4).map((color) => (
                    <span
                      key={color}
                      className="size-5 rounded-full border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </label>
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
              <span>Intervalle (Valeur de X)</span>
              <input className="field" type="number" min="1" name="interval" defaultValue={editingTask.recurrenceRule.interval} required />
            </label>
            <label className="field-label">
              <span>Attribution</span>
              <select className="field" name="assignmentMode" defaultValue={editingTask.assignmentRule.mode}>
                <option value="fixed">Fixe (toujours la même personne)</option>
                <option value="manual">Manuelle (choix à chaque fois)</option>
                <option value="strict_alternation">Alternance (chacun son tour)</option>
                <option value="round_robin">Round-robin (distribution équitable)</option>
                <option value="least_assigned_count">Équité : moins de tâches</option>
                <option value="least_assigned_minutes">Équité : moins de temps</option>
              </select>
            </label>
          </div>
          
          <label className="field-label mt-3">
            <span>Membres éligibles</span>
            <span className="field-help">Tout est coché par défaut, décochez simplement les personnes à exclure.</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((member) => (
                <label
                  key={member.id}
                  className="inline-flex items-center gap-3 rounded-[0.9rem] border border-[var(--line)] bg-white/70 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    name="eligibleMemberIds"
                    value={member.id}
                    defaultChecked={selectedMemberIds.includes(member.id)}
                  />
                  <span>{member.displayName}</span>
                </label>
              ))}
            </div>
          </label>

          <label className="field-label mt-3">
            <span className="inline-flex items-start gap-3 rounded-[1rem] border border-[var(--line)] bg-white/70 px-4 py-3 font-medium text-[var(--ink-950)]">
              <input name="forceOverwriteManual" type="checkbox" className="mt-1" />
              <span>
                Écraser les modifications manuelles (Si coché, les tâches futures modifiées manuellement seront réinitialisées avec ces nouvelles règles)
              </span>
            </span>
          </label>

          <div className="mt-4 flex gap-3">
            <button className="btn-primary px-5 py-2 font-semibold" type="submit">
              Enregistrer
            </button>
            <button className="btn-secondary px-5 py-2 font-semibold" type="button" onClick={() => setEditingTask(null)}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (deletingTask) {
    const manualOverrideCount = manualOverridesByTaskId[deletingTask.id] ?? 0;

    return (
      <div className="soft-panel p-5 border-2 border-red-500/20">
        <h4 className="text-xl font-semibold mb-2">Supprimer &quot;{deletingTask.title}&quot; ?</h4>
        {manualOverrideCount > 0 ? (
          <p className="text-sm text-[var(--ink-700)] mb-4">
            {manualOverrideCount} occurrence{manualOverrideCount > 1 ? "s" : ""} future{manualOverrideCount > 1 ? "s" : ""} modifiée{manualOverrideCount > 1 ? "s" : ""} manuellement existe{manualOverrideCount > 1 ? "nt" : ""}. Vous pouvez choisir de les conserver ou de les annuler avec la meta-tâche.
          </p>
        ) : (
          <p className="text-sm text-[var(--ink-700)] mb-4">
            La tâche ne sera plus générée à l&apos;avenir.
          </p>
        )}
        <form action={`/api/tasks/${deletingTask.id}`} method="post" onSubmit={() => setTimeout(() => setDeletingTask(null), 100)}>
          <input type="hidden" name="_method" value="DELETE" />
          <input type="hidden" name="householdId" value={householdId} />
          
          {manualOverrideCount > 0 ? (
            <label className="field-label mb-4">
              <span className="inline-flex items-start gap-3 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-900">
                <input name="deleteManual" type="checkbox" className="mt-1" />
                <span>
                  Annuler aussi les occurrences futures modifiées manuellement.
                </span>
              </span>
            </label>
          ) : null}

          <div className="flex gap-3">
            <button className="btn-primary bg-red-600 hover:bg-red-700 text-white px-5 py-2 font-semibold border-none" type="submit">
              Confirmer la suppression
            </button>
            <button className="btn-secondary px-5 py-2 font-semibold" type="button" onClick={() => setDeletingTask(null)}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {tasks.length === 0 && (
        <p className="text-[var(--ink-700)]">Aucune tâche configurée.</p>
      )}
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
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--coral-600)]">
                  {manualOverrideCount} occurrence{manualOverrideCount > 1 ? "s" : ""} future{manualOverrideCount > 1 ? "s" : ""} modifiée{manualOverrideCount > 1 ? "s" : ""}
                </p>
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
    </div>
  );
}
