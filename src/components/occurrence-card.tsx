import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { hexToRgba } from "@/lib/colors";
import { formatMinutes } from "@/lib/utils";

type OccurrenceCardProps = {
  occurrence: {
    id: string;
    scheduledDate: Date;
    status: string;
    notes: string | null;
    actualMinutes: number | null;
    taskTemplate: { title: string; category: string | null; estimatedMinutes: number; color: string };
    assignedMember: { id: string; displayName: string; color: string } | null;
  };
  members: { id: string; displayName: string }[];
  currentMemberId?: string | null;
  compact?: boolean;
};

export function OccurrenceCard({
  occurrence,
  members,
  currentMemberId,
  compact = false,
}: OccurrenceCardProps) {
  const isArchived = ["completed", "skipped", "cancelled"].includes(occurrence.status);
  const canEditOccurrence = occurrence.status !== "cancelled";
  const taskColor = occurrence.taskTemplate.color ?? "#D8643D";
  const statusLabel =
    occurrence.status === "completed"
      ? "Terminée"
      : occurrence.status === "skipped"
        ? "Sautée"
        : occurrence.status === "rescheduled"
          ? "Reportée"
          : occurrence.status === "overdue"
            ? "En retard"
            : occurrence.status.replace("_", " ");

  return (
    <article
      className="app-surface rounded-[1.7rem] p-4 sm:p-5"
      style={{
        borderColor: hexToRgba(taskColor, 0.28),
        boxShadow: `0 20px 60px ${hexToRgba(taskColor, 0.1)}`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: taskColor }}
            />
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--leaf-600)]">
              {format(occurrence.scheduledDate, "EEE d MMM", { locale: fr })}
            </p>
          </div>
          <h3 className="mt-1 text-lg font-semibold">{occurrence.taskTemplate.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-[var(--ink-700)]">
            {occurrence.taskTemplate.category ? (
              <span
                className="stat-pill px-3 py-1"
                style={{
                  backgroundColor: hexToRgba(taskColor, 0.12),
                  borderColor: hexToRgba(taskColor, 0.2),
                }}
              >
                {occurrence.taskTemplate.category}
              </span>
            ) : null}
            <span className="stat-pill px-3 py-1">
              {formatMinutes(occurrence.taskTemplate.estimatedMinutes)}
            </span>
            {occurrence.actualMinutes !== null ? (
              <span className="stat-pill px-3 py-1">
                Réel {formatMinutes(occurrence.actualMinutes)}
              </span>
            ) : null}
            <span className="stat-pill inline-flex items-center gap-2 px-3 py-1">
              {occurrence.assignedMember ? (
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: occurrence.assignedMember.color }}
                />
              ) : null}
              {occurrence.assignedMember ? occurrence.assignedMember.displayName : "À attribuer"}
            </span>
          </div>
        </div>
        <span
          className="stat-pill shrink-0 px-3 py-1 text-xs font-semibold capitalize"
          style={
            isArchived
              ? { backgroundColor: "rgba(56, 115, 93, 0.12)", borderColor: "rgba(56, 115, 93, 0.1)" }
              : undefined
          }
        >
          {statusLabel}
        </span>
      </div>

      {occurrence.notes ? (
        <p className="mt-3 text-sm leading-6 text-[var(--ink-700)]">{occurrence.notes}</p>
      ) : null}

      {!compact && canEditOccurrence ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={`/api/occurrences/${occurrence.id}/complete`} method="post">
            <input type="hidden" name="memberId" value={currentMemberId ?? ""} />
            <button className="btn-primary px-3 py-2 text-sm font-semibold" type="submit">
              Marquer terminée
            </button>
          </form>
          <form action={`/api/occurrences/${occurrence.id}/skip`} method="post">
            <input type="hidden" name="memberId" value={currentMemberId ?? ""} />
            <button className="btn-secondary px-3 py-2 text-sm font-semibold" type="submit">
              Marquer sautée
            </button>
          </form>
          {isArchived || occurrence.status === "rescheduled" ? (
            <form action={`/api/occurrences/${occurrence.id}/reopen`} method="post">
              <input type="hidden" name="memberId" value={currentMemberId ?? ""} />
              <button className="btn-secondary px-3 py-2 text-sm font-semibold" type="submit">
                Repasser à faire
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {!compact && canEditOccurrence ? (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--coral-600)] hover:underline list-none select-none outline-none focus:outline-none">
            <div className="flex items-center gap-2">
              <span className="group-open:hidden">▶ Gérer cette tâche</span>
              <span className="hidden group-open:inline">▼ Masquer les options</span>
            </div>
          </summary>
          <div className="mt-4 space-y-3">
            <form
              action={`/api/occurrences/${occurrence.id}/complete`}
              method="post"
              className="soft-panel grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto]"
              style={{ borderColor: hexToRgba(taskColor, 0.18) }}
            >
                <input type="hidden" name="memberId" value={currentMemberId ?? ""} />
                <label className="text-sm font-semibold text-[var(--ink-950)] sm:col-span-3">
                  Valider la tâche
                </label>
                <input
                  className="field"
                  type="number"
                  min="0"
                  name="actualMinutes"
                  defaultValue={occurrence.actualMinutes ?? ""}
                  placeholder="Minutes réelles"
                />
                <input
                  className="field"
                  type="text"
                  name="notes"
                  defaultValue={occurrence.notes ?? ""}
                  placeholder="Note facultative"
                />
                <button className="btn-primary px-4 py-3 text-sm font-semibold" type="submit">
                  {occurrence.status === "completed" ? "Mettre à jour" : "Marquer faite"}
                </button>
            </form>

            <form
              action={`/api/occurrences/${occurrence.id}/skip`}
              method="post"
              className="soft-panel grid gap-2 p-3 sm:grid-cols-[1fr_auto]"
              style={{ borderColor: hexToRgba(taskColor, 0.18) }}
            >
                <input type="hidden" name="memberId" value={currentMemberId ?? ""} />
                <label className="text-sm font-semibold text-[var(--ink-950)] sm:col-span-2">
                  Marquer comme sautée
                </label>
                <input
                  className="field"
                  type="text"
                  name="notes"
                  defaultValue={occurrence.status === "skipped" ? occurrence.notes ?? "" : ""}
                  placeholder="Pourquoi cette tâche est sautée ?"
                />
                <button className="btn-secondary px-4 py-3 text-sm font-semibold" type="submit">
                  {occurrence.status === "skipped" ? "Mettre à jour" : "Sauter"}
                </button>
            </form>

            <form
              action={`/api/occurrences/${occurrence.id}/reschedule`}
              method="post"
              className="soft-panel grid gap-2 p-3 sm:grid-cols-[1fr_auto]"
              style={{ borderColor: hexToRgba(taskColor, 0.18) }}
            >
              <input type="hidden" name="memberId" value={currentMemberId ?? ""} />
              <label className="text-sm font-semibold text-[var(--ink-950)] sm:col-span-2">
                Reporter à une autre date
              </label>
              <input className="field" type="date" name="date" required />
              <button className="btn-secondary px-4 py-3 text-sm font-semibold" type="submit">
                Reporter
              </button>
            </form>

            <form
              action={`/api/occurrences/${occurrence.id}/reassign`}
              method="post"
              className="soft-panel grid gap-2 p-3 sm:grid-cols-[1fr_auto]"
              style={{ borderColor: hexToRgba(taskColor, 0.18) }}
            >
              <input type="hidden" name="memberId" value={currentMemberId ?? ""} />
              <label className="text-sm font-semibold text-[var(--ink-950)] sm:col-span-2">
                Changer l&apos;attribution
              </label>
              <select className="field" name="assignedMemberId" defaultValue={occurrence.assignedMember?.id ?? ""}>
                <option value="">Choisir un membre</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
              <button className="btn-secondary px-4 py-3 text-sm font-semibold" type="submit">
                Réassigner
              </button>
            </form>
          </div>
        </details>
      ) : null}
    </article>
  );
}
