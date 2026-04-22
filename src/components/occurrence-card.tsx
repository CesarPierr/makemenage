import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  RotateCcw,
  Settings2,
  SkipForward,
} from "lucide-react";

import { hexToRgba } from "@/lib/colors";
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
    };
    assignedMember: { id: string; displayName: string; color: string } | null;
  };
  members: { id: string; displayName: string }[];
  currentMemberId?: string | null;
  compact?: boolean;
  returnTo?: string;
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
      accent: "#064e3b", // Emerald-900 (Very dark green)
      surface: "rgba(6, 78, 59, 0.08)",
      pillBackground: "rgba(6, 78, 59, 0.14)",
      pillColor: "#064e3b",
      border: "rgba(6, 78, 59, 0.2)",
    };
  }

  if (status === "skipped") {
    return {
      accent: "#374151", // Gray-700
      surface: "rgba(55, 65, 81, 0.06)",
      pillBackground: "rgba(55, 65, 81, 0.1)",
      pillColor: "#4b5563",
      border: "rgba(55, 65, 81, 0.16)",
    };
  }

  if (status === "rescheduled") {
    return {
      accent: "#0c4a6e", // Sky-900
      surface: "rgba(12, 74, 110, 0.08)",
      pillBackground: "rgba(12, 74, 110, 0.14)",
      pillColor: "#0c4a6e",
      border: "rgba(12, 74, 110, 0.2)",
    };
  }

  if (status === "overdue") {
    return {
      accent: "#7f1d1d", // Red-900
      surface: "rgba(127, 29, 29, 0.08)",
      pillBackground: "rgba(127, 29, 29, 0.14)",
      pillColor: "#7f1d1d",
      border: "rgba(127, 29, 29, 0.22)",
    };
  }

  if (status === "due") {
    return {
      accent: "#78350f", // Amber-900
      surface: "rgba(120, 53, 15, 0.08)",
      pillBackground: "rgba(120, 53, 15, 0.14)",
      pillColor: "#78350f",
      border: "rgba(120, 53, 15, 0.2)",
    };
  }

  return {
    accent: taskColor,
    surface: hexToRgba(taskColor, 0.08),
    pillBackground: hexToRgba(taskColor, 0.14),
    pillColor: "var(--ink-950)",
    border: hexToRgba(taskColor, 0.22),
  };
}

function getStatusMeta(status: string) {
  if (status === "completed") {
    return {
      label: "Terminée",
      hint: "Déjà faite",
      icon: CheckCircle2,
    };
  }

  if (status === "skipped") {
    return {
      label: "Sautée",
      hint: "Mise de côté",
      icon: SkipForward,
    };
  }

  if (status === "rescheduled") {
    return {
      label: "Reportée",
      hint: "Nouvelle date prévue",
      icon: RotateCcw,
    };
  }

  if (status === "overdue") {
    return {
      label: "En retard",
      hint: "À rattraper",
      icon: AlertCircle,
    };
  }

  if (status === "due") {
    return {
      label: "Aujourd’hui",
      hint: "À faire maintenant",
      icon: Clock3,
    };
  }

  return {
    label: "À faire",
    hint: "Prévue à venir",
    icon: CircleDashed,
  };
}

export function OccurrenceCard({
  occurrence,
  members,
  currentMemberId,
  compact = false,
  returnTo,
}: OccurrenceCardProps) {
  const canEditOccurrence = occurrence.status !== "cancelled";
  const taskColor = occurrence.taskTemplate.color ?? "#D8643D";
  const archived = ["completed", "skipped", "cancelled"].includes(occurrence.status);
  const statusTone = getStatusTone(occurrence.status, taskColor);
  const statusMeta = getStatusMeta(occurrence.status);
  const StatusIcon = statusMeta.icon;

  const cardStyle = archived
    ? occurrence.status === "completed"
      ? {
          borderColor: "rgba(6, 78, 59, 0.2)",
          background: "linear-gradient(135deg, rgba(6, 78, 59, 0.09), rgba(255, 255, 255, 0.98))",
          boxShadow: "0 14px 34px rgba(6, 78, 59, 0.08)",
        }
      : {
          // Skipped / Cancelled (Grayish)
          borderColor: "rgba(55, 65, 81, 0.16)",
          background: "linear-gradient(135deg, rgba(55, 65, 81, 0.07), rgba(255, 255, 255, 0.98))",
          boxShadow: "0 12px 30px rgba(0, 0, 0, 0.04)",
        }
    : occurrence.status === "overdue"
    ? {
        borderColor: "rgba(127, 29, 29, 0.22)",
        background: "linear-gradient(135deg, rgba(127, 29, 29, 0.09), rgba(255, 255, 255, 0.98))",
        boxShadow: "0 16px 40px rgba(127, 29, 29, 0.1)",
      }
    : {
        // Active / Planned
        borderColor: statusTone.border,
        background: `linear-gradient(135deg, ${statusTone.surface}, rgba(255, 255, 255, 0.99))`,
        boxShadow: `0 18px 50px ${hexToRgba(taskColor, 0.08)}`,
      };

  return (
    <article
      className="app-surface relative overflow-hidden rounded-[1.7rem] p-4 sm:p-5 transition-all duration-300"
      style={cardStyle}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundColor: statusTone.accent }}
      />

      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border px-3 py-3"
        style={{
          borderColor: statusTone.border,
          backgroundColor: statusTone.pillBackground,
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm"
            style={{ backgroundColor: "#fff", color: statusTone.accent, border: `1px solid ${statusTone.border}` }}
          >
            <StatusIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] opacity-60" style={{ color: statusTone.accent }}>
              Statut
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold" style={{ color: statusTone.pillColor }}>
                {statusMeta.label}
              </p>
              <span className="text-[0.75rem] font-medium opacity-70" style={{ color: statusTone.pillColor }}>{statusMeta.hint}</span>
            </div>
          </div>
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.18em] opacity-60">
          {format(occurrence.scheduledDate, "EEE d MMM", { locale: fr })}
        </span>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">{occurrence.taskTemplate.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-[var(--ink-700)]">
            {occurrence.taskTemplate.room ? (
              <span
                className="stat-pill px-3 py-1"
                style={{
                  backgroundColor: "rgba(255,255,255,0.88)",
                  borderColor: statusTone.border,
                  color: "var(--ink-900)",
                }}
              >
                {occurrence.taskTemplate.room}
              </span>
            ) : null}
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
            backgroundColor: "rgba(255,255,255,0.86)",
            borderColor: statusTone.border,
            color: statusTone.pillColor,
          }}
        >
          {getStatusLabel(occurrence.status)}
        </span>
      </div>

      {occurrence.notes ? <p className="mt-3 text-sm leading-6 text-[var(--ink-700)]">{occurrence.notes}</p> : null}

      {occurrence.isManuallyModified && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[rgba(216,100,61,0.16)] bg-[rgba(216,100,61,0.1)] px-3 py-2 text-[0.7rem] font-bold uppercase tracking-wider text-[var(--coral-600)] shadow-sm">
          <AlertCircle className="size-3.5" />
          <div className="flex flex-wrap gap-x-2">
            <span>Date déplacée</span>
            <span className="opacity-40">—</span>
            <span>Dernier changement manuel</span>
            <span className="normal-case opacity-60">(</span>
            <span className="normal-case opacity-60">Date actuelle:</span>
            <span className="normal-case opacity-60">{format(occurrence.scheduledDate, "d/MM/yy", { locale: fr })})</span>
          </div>
        </div>
      )}

      {!compact && canEditOccurrence ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <form action={`/api/occurrences/${occurrence.id}/complete`} method="post">
            <input name="memberId" type="hidden" value={currentMemberId ?? ""} />
            {returnTo ? <input name="nextPath" type="hidden" value={returnTo} /> : null}
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
            {returnTo ? <input name="nextPath" type="hidden" value={returnTo} /> : null}
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
              {returnTo ? <input name="nextPath" type="hidden" value={returnTo} /> : null}
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
              {returnTo ? <input name="nextPath" type="hidden" value={returnTo} /> : null}
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
              {returnTo ? <input name="nextPath" type="hidden" value={returnTo} /> : null}
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
                {returnTo ? <input name="nextPath" type="hidden" value={returnTo} /> : null}
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
                {returnTo ? <input name="nextPath" type="hidden" value={returnTo} /> : null}
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
