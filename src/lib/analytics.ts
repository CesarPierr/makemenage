import { subDays } from "date-fns";

type MemberLike = {
  id: string;
  displayName: string;
  color: string;
  isActive: boolean;
};

type OccurrenceLike = {
  assignedMemberId: string | null;
  completedByMemberId?: string | null;
  actualMinutes: number | null;
  status: string;
  completedAt?: Date | null;
  taskTemplate?: {
    estimatedMinutes: number;
  };
};

export function buildLoadMetrics(members: MemberLike[], occurrences: OccurrenceLike[]) {
  const activeMembers = members.filter((member) => member.isActive);
  const totalMinutes = occurrences.reduce(
    (sum, occurrence) => sum + (occurrence.actualMinutes ?? occurrence.taskTemplate?.estimatedMinutes ?? 0),
    0,
  );

  const byMember = activeMembers.map((member) => {
    const owned = occurrences.filter((occurrence) => occurrence.assignedMemberId === member.id);
    const plannedMinutes = owned.reduce(
      (sum, occurrence) => sum + (occurrence.actualMinutes ?? occurrence.taskTemplate?.estimatedMinutes ?? 0),
      0,
    );
    const completed = owned.filter((occurrence) => occurrence.status === "completed").length;

    return {
      memberId: member.id,
      displayName: member.displayName,
      color: member.color,
      plannedCount: owned.length,
      completedCount: completed,
      plannedMinutes,
      completionRate: owned.length ? (completed / owned.length) * 100 : 0,
    };
  });

  const idealMinutes = activeMembers.length ? totalMinutes / activeMembers.length : 0;

  return {
    totalOccurrences: occurrences.length,
    totalMinutes,
    byMember,
    fairness: byMember.map((member) => ({
      memberId: member.memberId,
      displayName: member.displayName,
      deltaMinutes: member.plannedMinutes - idealMinutes,
    })),
  };
}

export function buildRollingCompletionMetrics(members: MemberLike[], occurrences: OccurrenceLike[]) {
  const activeMembers = members.filter((member) => member.isActive);
  const now = new Date();

  return [7, 30].map((days) => {
    const threshold = subDays(now, days);
    const completed = occurrences.filter(
      (occurrence) =>
        occurrence.status === "completed" &&
        occurrence.completedAt &&
        occurrence.completedAt >= threshold,
    );

    return {
      days,
      byMember: activeMembers.map((member) => {
        const done = completed.filter(
          (occurrence) =>
            (occurrence.completedByMemberId ?? occurrence.assignedMemberId) === member.id,
        );

        return {
          memberId: member.id,
          displayName: member.displayName,
          color: member.color,
          completedCount: done.length,
          minutesSpent: done.reduce(
            (sum, occurrence) => sum + (occurrence.actualMinutes ?? occurrence.taskTemplate?.estimatedMinutes ?? 0),
            0,
          ),
        };
      }),
    };
  });
}
