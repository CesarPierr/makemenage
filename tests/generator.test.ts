import { describe, expect, it } from "vitest";

import { generateOccurrences } from "@/lib/scheduling/generator";

describe("occurrence generation", () => {
  it("creates stable strict alternation occurrences", () => {
    const generated = generateOccurrences({
      template: {
        id: "task-bathroom",
        householdId: "home-1",
        title: "Bathroom",
        estimatedMinutes: 30,
        startsOn: new Date("2026-01-05"),
        recurrence: {
          type: "every_x_weeks",
          interval: 2,
          anchorDate: new Date("2026-01-05"),
          dueOffsetDays: 0,
        },
        assignment: {
          mode: "strict_alternation",
          eligibleMemberIds: ["A", "B"],
          rotationOrder: ["A", "B"],
        },
      },
      members: [
        { id: "A", displayName: "Alice", isActive: true },
        { id: "B", displayName: "Bob", isActive: true },
      ],
      absences: [],
      existingOccurrences: [],
      rangeStart: new Date("2026-01-01"),
      rangeEnd: new Date("2026-03-31"),
    });

    expect(generated.map((occurrence) => occurrence.assignedMemberId)).toEqual([
      "A",
      "B",
      "A",
      "B",
      "A",
      "B",
      "A",
    ]);
  });

  it("preserves manually modified occurrences on regeneration", () => {
    const generated = generateOccurrences({
      template: {
        id: "task-floor",
        householdId: "home-1",
        title: "Floor",
        estimatedMinutes: 20,
        startsOn: new Date("2026-01-01"),
        recurrence: {
          type: "every_x_days",
          interval: 7,
          anchorDate: new Date("2026-01-01"),
          dueOffsetDays: 0,
        },
        assignment: {
          mode: "round_robin",
          eligibleMemberIds: ["A", "B", "C"],
          rotationOrder: ["A", "B", "C"],
        },
      },
      members: [
        { id: "A", displayName: "Alice", isActive: true },
        { id: "B", displayName: "Bob", isActive: true },
        { id: "C", displayName: "Chloe", isActive: true },
      ],
      absences: [],
      existingOccurrences: [
        {
          id: "occ-1",
          sourceGenerationKey: "task-floor:2026-01-08",
          scheduledDate: new Date("2026-01-08"),
          dueDate: new Date("2026-01-08"),
          assignedMemberId: "C",
          status: "rescheduled",
          isManuallyModified: true,
        },
      ],
      rangeStart: new Date("2026-01-01"),
      rangeEnd: new Date("2026-01-31"),
    });

    expect(generated.find((occurrence) => occurrence.sourceGenerationKey === "task-floor:2026-01-08")).toBeUndefined();
  });

  it("keeps rotating future assignments after a protected manual occurrence", () => {
    const generated = generateOccurrences({
      template: {
        id: "task-dishes",
        householdId: "home-1",
        title: "Vaisselle",
        estimatedMinutes: 25,
        startsOn: new Date("2026-01-01"),
        recurrence: {
          type: "every_x_days",
          interval: 7,
          anchorDate: new Date("2026-01-01"),
          dueOffsetDays: 0,
        },
        assignment: {
          mode: "strict_alternation",
          eligibleMemberIds: ["A", "B"],
          rotationOrder: ["A", "B"],
        },
      },
      members: [
        { id: "A", displayName: "Alice", isActive: true },
        { id: "B", displayName: "Bob", isActive: true },
      ],
      absences: [],
      existingOccurrences: [
        {
          id: "occ-1",
          sourceGenerationKey: "task-dishes:2026-01-01",
          scheduledDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-01"),
          assignedMemberId: "A",
          status: "planned",
          isManuallyModified: false,
        },
        {
          id: "occ-2",
          sourceGenerationKey: "task-dishes:2026-01-08",
          scheduledDate: new Date("2026-01-08"),
          dueDate: new Date("2026-01-08"),
          assignedMemberId: "A",
          status: "rescheduled",
          isManuallyModified: true,
        },
      ],
      rangeStart: new Date("2026-01-01"),
      rangeEnd: new Date("2026-01-31"),
    });

    const jan15 = generated.find((occurrence) => occurrence.sourceGenerationKey === "task-dishes:2026-01-15");
    expect(jan15?.assignedMemberId).toBe("B");
  });

  it("creates a single occurrence when the task ends on its start date", () => {
    const generated = generateOccurrences({
      template: {
        id: "task-single",
        householdId: "home-1",
        title: "Passage unique",
        estimatedMinutes: 15,
        startsOn: new Date("2026-01-10"),
        endsOn: new Date("2026-01-10"),
        recurrence: {
          type: "daily",
          interval: 1,
          anchorDate: new Date("2026-01-10"),
          dueOffsetDays: 0,
          config: { singleRun: true },
        },
        assignment: {
          mode: "fixed",
          eligibleMemberIds: ["A"],
          fixedMemberId: "A",
          rotationOrder: ["A"],
        },
      },
      members: [{ id: "A", displayName: "Alice", isActive: true }],
      absences: [],
      existingOccurrences: [],
      rangeStart: new Date("2026-01-01"),
      rangeEnd: new Date("2026-01-31"),
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]?.sourceGenerationKey).toBe("task-single:2026-01-10");
  });

  it("rebalances future alternation after adding a new eligible member", () => {
    const generated = generateOccurrences({
      template: {
        id: "task-rotation",
        householdId: "home-1",
        title: "Rotation",
        estimatedMinutes: 15,
        startsOn: new Date("2026-04-22"),
        recurrence: {
          type: "daily",
          interval: 1,
          anchorDate: new Date("2026-04-22"),
          dueOffsetDays: 0,
        },
        assignment: {
          mode: "strict_alternation",
          eligibleMemberIds: ["A", "B", "C"],
          rotationOrder: ["A", "B", "C"],
        },
      },
      members: [
        { id: "A", displayName: "Alice", isActive: true },
        { id: "B", displayName: "Bob", isActive: true },
        { id: "C", displayName: "Chloe", isActive: true },
      ],
      absences: [],
      existingOccurrences: [
        {
          sourceGenerationKey: "task-rotation:2026-04-22",
          scheduledDate: new Date("2026-04-22"),
          dueDate: new Date("2026-04-22"),
          assignedMemberId: "A",
          status: "planned",
        },
        {
          sourceGenerationKey: "task-rotation:2026-04-23",
          scheduledDate: new Date("2026-04-23"),
          dueDate: new Date("2026-04-23"),
          assignedMemberId: "B",
          status: "planned",
        },
        {
          sourceGenerationKey: "task-rotation:2026-04-24",
          scheduledDate: new Date("2026-04-24"),
          dueDate: new Date("2026-04-24"),
          assignedMemberId: "A",
          status: "planned",
        },
      ],
      rangeStart: new Date("2026-04-22"),
      rangeEnd: new Date("2026-04-24"),
    });

    expect(generated.map((occurrence) => occurrence.assignedMemberId)).toEqual(["A", "B", "C"]);
  });
});
