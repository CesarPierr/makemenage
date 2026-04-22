import { describe, expect, it } from "vitest";

import { pickAssignee } from "@/lib/scheduling/assignment";

const members = [
  { id: "A", displayName: "Alice", isActive: true },
  { id: "B", displayName: "Bob", isActive: true },
  { id: "C", displayName: "Chloe", isActive: true },
];

describe("assignment engine", () => {
  it("alternates strictly for A/B", () => {
    const picks = [0, 1, 2, 3].map((sequenceIndex) =>
      pickAssignee({
        sequenceIndex,
        rule: {
          mode: "strict_alternation",
          eligibleMemberIds: ["A", "B"],
          rotationOrder: ["A", "B"],
        },
        members,
        scheduledDate: new Date("2026-01-01"),
        absences: [],
        estimatedMinutes: 20,
        existingOccurrences: [],
      }),
    );

    expect(picks).toEqual(["A", "B", "A", "B"]);
  });

  it("round robins for A/B/C", () => {
    const picks = [0, 1, 2, 3].map((sequenceIndex) =>
      pickAssignee({
        sequenceIndex,
        rule: {
          mode: "round_robin",
          eligibleMemberIds: ["A", "B", "C"],
          rotationOrder: ["A", "B", "C"],
        },
        members,
        scheduledDate: new Date("2026-01-01"),
        absences: [],
        estimatedMinutes: 20,
        existingOccurrences: [],
      }),
    );

    expect(picks).toEqual(["A", "B", "C", "A"]);
  });

  it("continues rotation from historical assignments when sequence restarts", () => {
    const pick = pickAssignee({
      sequenceIndex: 0,
      rule: {
        mode: "strict_alternation",
        eligibleMemberIds: ["A", "B"],
        rotationOrder: ["A", "B"],
      },
      members,
      scheduledDate: new Date("2026-01-15"),
      absences: [],
      estimatedMinutes: 20,
      existingOccurrences: [
        {
          sourceGenerationKey: "task-1:2026-01-01",
          scheduledDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-01"),
          assignedMemberId: "A",
          status: "planned",
        },
      ],
    });

    expect(pick).toBe("B");
  });

  it("rebalances when a member is absent", () => {
    const pick = pickAssignee({
      sequenceIndex: 1,
      rule: {
        mode: "strict_alternation",
        eligibleMemberIds: ["A", "B"],
        rotationOrder: ["A", "B"],
        rebalanceOnMemberAbsence: true,
      },
      members,
      scheduledDate: new Date("2026-01-10"),
      absences: [
        {
          memberId: "B",
          startDate: new Date("2026-01-09"),
          endDate: new Date("2026-01-11"),
        },
      ],
      estimatedMinutes: 20,
      existingOccurrences: [],
    });

    expect(pick).toBe("A");
  });

  it("chooses the least loaded member by count", () => {
    const pick = pickAssignee({
      sequenceIndex: 3,
      rule: {
        mode: "least_assigned_count",
        eligibleMemberIds: ["A", "B", "C"],
        rotationOrder: ["A", "B", "C"],
        fairnessWindowDays: 14,
      },
      members,
      scheduledDate: new Date("2026-02-01"),
      absences: [],
      estimatedMinutes: 30,
      existingOccurrences: [
        {
          sourceGenerationKey: "1",
          scheduledDate: new Date("2026-01-29"),
          dueDate: new Date("2026-01-29"),
          assignedMemberId: "A",
          status: "planned",
        },
        {
          sourceGenerationKey: "2",
          scheduledDate: new Date("2026-01-30"),
          dueDate: new Date("2026-01-30"),
          assignedMemberId: "A",
          status: "planned",
        },
        {
          sourceGenerationKey: "3",
          scheduledDate: new Date("2026-01-31"),
          dueDate: new Date("2026-01-31"),
          assignedMemberId: "B",
          status: "planned",
        },
      ],
    });

    expect(pick).toBe("C");
  });

  it("keeps skipped member as next assignee when skip should carry over", () => {
    const pick = pickAssignee({
      sequenceIndex: 0,
      rule: {
        mode: "strict_alternation",
        eligibleMemberIds: ["A", "B"],
        rotationOrder: ["A", "B"],
        preserveRotationOnSkip: false,
      },
      members,
      scheduledDate: new Date("2026-02-10"),
      absences: [],
      estimatedMinutes: 30,
      existingOccurrences: [
        {
          sourceGenerationKey: "task:2026-02-01",
          scheduledDate: new Date("2026-02-01"),
          dueDate: new Date("2026-02-01"),
          assignedMemberId: "A",
          status: "planned",
        },
        {
          sourceGenerationKey: "task:2026-02-08",
          scheduledDate: new Date("2026-02-08"),
          dueDate: new Date("2026-02-08"),
          assignedMemberId: "B",
          status: "skipped",
        },
      ],
    });

    expect(pick).toBe("B");
  });
});
