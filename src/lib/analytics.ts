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

  return [7, 14, 30].map((days) => {
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

export function calculateStreak(occurrences: OccurrenceLike[]): number {
  const completedDates = occurrences
    .filter((o) => o.status === "completed" && o.completedAt)
    .map((o) => {
      // Use local timezone offset safely to get YYYY-MM-DD
      const date = new Date(o.completedAt as Date);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    });

  const uniqueDates = [...new Set(completedDates)].sort().reverse(); // newest first
  if (uniqueDates.length === 0) return 0;

  const now = new Date();
  const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  const yesterday = new Date(now.getTime() - 86400000 - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 0;
  let expectedDate = uniqueDates[0];

  for (const date of uniqueDates) {
    if (date === expectedDate) {
      streak++;
      const prev = new Date(new Date(date).getTime() - 86400000);
      expectedDate = new Date(prev.getTime() - prev.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    } else {
      break;
    }
  }

  return streak;
}
