import type { TaskOccurrence, HouseholdMember } from "@prisma/client";

export function buildLoadMetrics(members: HouseholdMember[], occurrences: TaskOccurrence[]) {
  const activeMembers = members.filter((member) => member.isActive);
  const totalMinutes = occurrences.reduce((sum, occurrence) => sum + (occurrence.actualMinutes ?? 0), 0);

  const byMember = activeMembers.map((member) => {
    const owned = occurrences.filter((occurrence) => occurrence.assignedMemberId === member.id);
    const plannedMinutes = owned.reduce((sum, occurrence) => sum + (occurrence.actualMinutes ?? 0), 0);
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
