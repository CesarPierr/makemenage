type MemberLike = {
  id: string;
  displayName: string;
  color: string;
  isActive: boolean;
};

type OccurrenceLike = {
  assignedMemberId: string | null;
  actualMinutes: number | null;
  status: string;
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
