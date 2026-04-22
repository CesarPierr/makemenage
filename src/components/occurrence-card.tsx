import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, CircleDashed, RotateCcw, Settings2 } from "lucide-react";

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

function getStatusLabel(status: string) {
  if (status === "completed") return "Terminée";
  if (status === "skipped") return "Sautée";
  if (status === "rescheduled") return "Reportée";
  if (status === "overdue") return "En retard";
  if (status === "planned") return "À faire";
  if (status === "due") return "Aujourd’hui";
  return status.replace("_", " ");
}

function getStatusTone(status: string, taskColor: string) {
  if (status === "completed") {
    return {
      accent: "var(--leaf-600)",
      surface: "rgba(56, 115, 93, 0.1)",
      pillBackground: "rgba(56, 115, 93, 0.12)",
      pillColor: "var(--leaf-600)",
      border: "rgba(56, 115, 93, 0.16)",
    };
  }

  if (status === "skipped") {
    return {
      accent: "var(--ink-700)",
      surface: "rgba(30, 31, 34, 0.05)",
      pillBackground: "rgba(30, 31, 34, 0.06)",
      pillColor: "var(--ink-700)",
      border: "rgba(30, 31, 34, 0.08)",
    };
  }

  if (status === "rescheduled") {
    return {
      accent: "var(--sky-600)",
      surface: "rgba(47, 109, 136, 0.1)",
      pillBackground: "rgba(47, 109, 136, 0.12)",
      pillColor: "var(--sky-600)",
      border: "rgba(47, 109, 136, 0.16)",
    };
  }

  if (status === "overdue") {
    return {
      accent: "var(--coral-600)",
      surface: "rgba(216, 100, 61, 0.1)",
      pillBackground: "rgba(216, 100, 61, 0.12)",
      pillColor: "var(--coral-600)",
      border: "rgba(216, 100, 61, 0.16)",
    };
  }

  if (status === "due") {
    return {
      accent: "var(--coral-600)",
      surface: "rgba(200, 142, 61, 0.12)",
      pillBackground: "rgba(200, 142, 61, 0.16)",
      pillColor: "var(--coral-600)",
      border: "rgba(200, 142, 61, 0.18)",
    };
  }

  return {
    accent: taskColor,
    surface: hexToRgba(taskColor, 0.08),
    pillBackground: hexToRgba(taskColor, 0.12),
    pillColor: "var(--ink-950)",
    border: hexToRgba(taskColor, 0.18),
  };
}

export function OccurrenceCard({
  occurrence,
  members,
  currentMemberId,
  compact = false,
}: OccurrenceCardProps) {
  const canEditOccurrence = occurrence.status !== "cancelled";
  const taskColor = occurrence.taskTemplate.color ?? "#D8643D";
  const archived = ["completed", "skipped", "cancelled"].includes(occurrence.status);
  const statusTone = getStatusTone(occurrence.status, taskColor);

  return (
    <article
      className="app-surface rounded-[1.7rem] p-4 sm:p-5"
      style={{
        borderColor: statusTone.border,
        background: `linear-gradient(135deg, ${statusTone.surface}, rgba(255, 255, 255, 0.9))`,
        boxShadow: `0 18px 50px ${hexToRgba(taskColor, 0.08)}`,
      }}
    >
      <div
        className="mb-4 h-1.5 w-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${statusTone.accent}, ${hexToRgba(taskColor, 0.42)})` }}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="size-3 rounded-full" style={{ backgroundColor: taskColor }} />
            <p className="text-sm uppercase tracking-[0.18em]" style={{ color: statusTone.accent }}>
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
            <span className="stat-pill px-3 py-1">{formatMinutes(occurrence.taskTemplate.estimatedMinutes)}</span>
            {occurrence.actualMinutes !== null ? (
              <span className="stat-pill px-3 py-1">Réel {formatMinutes(occurrence.actualMinutes)}</span>
            ) : null}
            <span className="stat-pill inline-flex items-center gap-2 px-3 py-1">
              {occurrence.assignedMember ? (
                <span className="size-2.5 rounded-full" style={{ backgroundColor: occurrence.assignedMember.color }} />
              ) : null}
              {occurrence.assignedMember?.displayName ?? "À attribuer"}
            </span>
          </div>
        </div>
        <span
          className="stat-pill shrink-0 px-3 py-1 text-xs font-semibold"
          style={{
            backgroundColor: statusTone.pillBackground,
            borderColor: statusTone.border,
            color: statusTone.pillColor,
          }}
        >
          {getStatusLabel(occurrence.status)}
        </span>
      </div>

      {occurrence.notes ? <p className="mt-3 text-sm leading-6 text-[var(--ink-700)]">{occurrence.notes}</p> : null}

      {!compact && canEditOccurrence ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <form action={`/api/occurrences/${occurrence.id}/complete`} method="post">
            <input name="memberId" type="hidden" value={currentMemberId ?? ""} />
            <button
              className="w-full rounded-[1.2rem] border border-[rgba(56,115,93,0.16)] bg-[rgba(56,115,93,0.12)] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgba(56,115,93,0.18)] hover:shadow-[0_12px_24px_rgba(56,115,93,0.12)]"
              type="submit"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--leaf-600)]">
                <CheckCircle2 className="size-4" />
                Terminée
              </span>
              <span className="mt-1 block text-xs text-[var(--ink-700)]">Valider rapidement</span>
            </button>
          </form>

          <form action={`/api/occurrences/${occurrence.id}/skip`} method="post">
            <input name="memberId" type="hidden" value={currentMemberId ?? ""} />
            <button
              className="w-full rounded-[1.2rem] border border-[rgba(30,31,34,0.08)] bg-[rgba(30,31,34,0.04)] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgba(30,31,34,0.07)] hover:shadow-[0_12px_24px_rgba(30,31,34,0.08)]"
              type="submit"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-950)]">
                <CircleDashed className="size-4" />
                Sautée
              </span>
              <span className="mt-1 block text-xs text-[var(--ink-700)]">Ne pas faire cette fois</span>
            </button>
          </form>

          {archived || occurrence.status === "rescheduled" ? (
            <form action={`/api/occurrences/${occurrence.id}/reopen`} method="post">
              <input name="memberId" type="hidden" value={currentMemberId ?? ""} />
              <button
                className="w-full rounded-[1.2rem] border border-[rgba(47,109,136,0.16)] bg-[rgba(47,109,136,0.1)] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgba(47,109,136,0.16)] hover:shadow-[0_12px_24px_rgba(47,109,136,0.12)]"
                type="submit"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sky-600)]">
                  <RotateCcw className="size-4" />
                  À refaire
                </span>
                <span className="mt-1 block text-xs text-[var(--ink-700)]">Revenir à l’état actif</span>
              </button>
            </form>
          ) : (
            <div className="rounded-[1.2rem] border border-transparent px-4 py-3" />
          )}
        </div>
      ) : null}

      {!compact && canEditOccurrence ? (
        <details className="mt-4 group">
          <summary className="list-none cursor-pointer text-sm font-semibold text-[var(--sky-600)]">
            <span className="inline-flex items-center gap-2">
              <Settings2 className="size-4" />
              Ajuster minutes, note, date ou attribution
            </span>
          </summary>
          <div className="mt-4 space-y-3">
            <form
              action={`/api/occurrences/${occurrence.id}/complete`}
              className="soft-panel grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto]"
              method="post"
              style={{ borderColor: hexToRgba(taskColor, 0.16) }}
            >
              <input name="memberId" type="hidden" value={currentMemberId ?? ""} />
              <label className="text-sm font-semibold text-[var(--ink-950)] sm:col-span-3">Valider avec détail</label>
              <input
                className="field"
                defaultValue={occurrence.actualMinutes ?? ""}
                min="0"
                name="actualMinutes"
                placeholder="Minutes réelles"
                type="number"
              />
              <input
                className="field"
                defaultValue={occurrence.notes ?? ""}
                name="notes"
                placeholder="Note"
                type="text"
              />
              <button className="btn-primary px-4 py-3 text-sm font-semibold" type="submit">
                Enregistrer
              </button>
            </form>

            <form
              action={`/api/occurrences/${occurrence.id}/skip`}
              className="soft-panel grid gap-2 p-3 sm:grid-cols-[1fr_auto]"
              method="post"
              style={{ borderColor: hexToRgba(taskColor, 0.16) }}
            >
              <input name="memberId" type="hidden" value={currentMemberId ?? ""} />
              <input
                className="field"
                defaultValue={occurrence.status === "skipped" ? occurrence.notes ?? "" : ""}
                name="notes"
                placeholder="Pourquoi cette tâche est sautée ?"
                type="text"
              />
              <button className="btn-quiet px-4 py-3 text-sm font-semibold" type="submit">
                Sauter avec note
              </button>
            </form>

            <div className="grid gap-3 sm:grid-cols-2">
              <form
                action={`/api/occurrences/${occurrence.id}/reschedule`}
                className="soft-panel grid gap-2 p-3"
                method="post"
                style={{ borderColor: hexToRgba(taskColor, 0.16) }}
              >
                <input name="memberId" type="hidden" value={currentMemberId ?? ""} />
                <label className="text-sm font-semibold text-[var(--ink-950)]">Reporter</label>
                <input className="field" name="date" required type="date" />
                <button className="btn-quiet px-4 py-3 text-sm font-semibold" type="submit">
                  Changer la date
                </button>
              </form>

              <form
                action={`/api/occurrences/${occurrence.id}/reassign`}
                className="soft-panel grid gap-2 p-3"
                method="post"
                style={{ borderColor: hexToRgba(taskColor, 0.16) }}
              >
                <input name="memberId" type="hidden" value={currentMemberId ?? ""} />
                <label className="text-sm font-semibold text-[var(--ink-950)]">Réattribuer</label>
                <select className="field" defaultValue={occurrence.assignedMember?.id ?? ""} name="assignedMemberId">
                  <option value="">Choisir un membre</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
                <button className="btn-quiet px-4 py-3 text-sm font-semibold" type="submit">
                  Changer l’attribution
                </button>
              </form>
            </div>
          </div>
        </details>
      ) : null}
    </article>
  );
}
