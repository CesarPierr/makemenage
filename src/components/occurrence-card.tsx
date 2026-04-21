import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { formatMinutes } from "@/lib/utils";

type OccurrenceCardProps = {
  occurrence: {
    id: string;
    scheduledDate: Date;
    status: string;
    notes: string | null;
    taskTemplate: { title: string; category: string | null; estimatedMinutes: number };
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
  const isDone = occurrence.status === "completed";
  const isArchived = ["completed", "skipped", "cancelled"].includes(occurrence.status);
  const statusLabel = occurrence.status.replace("_", " ");

  return (
    <article className="app-surface rounded-[1.7rem] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--leaf-600)]">
            {format(occurrence.scheduledDate, "EEE d MMM", { locale: fr })}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{occurrence.taskTemplate.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-[var(--ink-700)]">
            {occurrence.taskTemplate.category ? (
              <span className="stat-pill px-3 py-1">{occurrence.taskTemplate.category}</span>
            ) : null}
            <span className="stat-pill px-3 py-1">
              {formatMinutes(occurrence.taskTemplate.estimatedMinutes)}
            </span>
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

      {!compact && !isArchived ? (
        <div className="mt-4 space-y-3">
          <div className="soft-panel px-3 py-3">
            <p className="text-sm font-semibold text-[var(--ink-950)]">Actions rapides</p>
            <p className="mt-1 text-sm text-[var(--ink-700)]">
              Faites, sautez ou ajustez cette occurrence sans quitter l&apos;écran.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <form action={`/api/occurrences/${occurrence.id}/complete`} method="post">
              <input type="hidden" name="memberId" value={currentMemberId ?? ""} />
              <button className="btn-primary w-full px-4 py-3 text-sm font-semibold" type="submit">
                {isDone ? "Déjà faite" : "Marquer faite"}
              </button>
            </form>
            <form action={`/api/occurrences/${occurrence.id}/skip`} method="post">
              <input type="hidden" name="memberId" value={currentMemberId ?? ""} />
              <button className="btn-secondary w-full px-4 py-3 text-sm font-semibold" type="submit">
                Sauter
              </button>
            </form>
          </div>

          <form
            action={`/api/occurrences/${occurrence.id}/reschedule`}
            method="post"
            className="soft-panel grid gap-2 p-3 sm:grid-cols-[1fr_auto]"
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
      ) : null}
    </article>
  );
}
