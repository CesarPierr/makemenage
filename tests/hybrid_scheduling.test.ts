import { describe, expect, it } from "vitest";
import { startOfDay, addDays, format } from "date-fns";
import { generateOccurrences } from "@/lib/scheduling/generator";

const isoDate = (date: Date) => format(date, "yyyy-MM-dd");

describe("Hybrid Scheduling (Fixed vs Sliding)", () => {
  const members = [
    { id: "A", displayName: "Alice", isActive: true },
    { id: "B", displayName: "Bob", isActive: true },
  ];

  it("SLIDING: future tasks slide forward when the last occurrence is rescheduled (delayed)", () => {
    const startsOn = new Date("2026-05-01"); // Friday
    
    // Scenario: Task every 7 days. 
    // Occurrence 1 was scheduled for May 1st, but rescheduled to May 3rd (Sunday).
    // Occurrence 2 should now be May 10th (Sunday) instead of May 8th (Friday).
    
    const generated = generateOccurrences({
      template: {
        id: "task-sliding",
        householdId: "h1",
        title: "Sliding Task",
        estimatedMinutes: 30,
        startsOn,
        recurrence: {
          type: "every_x_days",
          mode: "SLIDING",
          interval: 7,
          anchorDate: startsOn,
        },
        assignment: {
          mode: "strict_alternation",
          eligibleMemberIds: ["A", "B"],
          rotationOrder: ["A", "B"],
        },
      },
      members,
      absences: [],
      existingOccurrences: [
        {
          sourceGenerationKey: "task-sliding:sliding:0",
          scheduledDate: new Date("2026-05-03"), // Rescheduled to Sunday
          dueDate: new Date("2026-05-03"),
          assignedMemberId: "A",
          status: "rescheduled",
          isManuallyModified: true,
        },
      ],
      rangeStart: new Date("2026-05-01"),
      rangeEnd: new Date("2026-05-20"),
    });

    // Check Occurrence index 1
    const occ1 = generated.find(o => o.sourceGenerationKey === "task-sliding:sliding:1");
    expect(occ1).toBeDefined();
    expect(isoDate(occ1!.scheduledDate)).toBe("2026-05-10"); // May 3rd + 7 days
    
    // Check Occurrence index 2
    const occ2 = generated.find(o => o.sourceGenerationKey === "task-sliding:sliding:2");
    expect(occ2).toBeDefined();
    expect(isoDate(occ2!.scheduledDate)).toBe("2026-05-17"); // May 10th + 7 days
  });

  it("FIXED: future tasks stay anchored even if the last occurrence was delayed", () => {
    const startsOn = new Date("2026-05-01"); // Friday
    
    // Scenario: Task every 7 days, mode FIXED.
    // Occurrence 1 was May 1st, rescheduled to May 3rd.
    // Occurrence 2 should STILL be May 8th.
    
    const generated = generateOccurrences({
      template: {
        id: "task-fixed",
        householdId: "h1",
        title: "Fixed Task",
        estimatedMinutes: 30,
        startsOn,
        recurrence: {
          type: "every_x_days",
          mode: "FIXED",
          interval: 7,
          anchorDate: startsOn,
        },
        assignment: {
          mode: "strict_alternation",
          eligibleMemberIds: ["A", "B"],
          rotationOrder: ["A", "B"],
        },
      },
      members,
      absences: [],
      existingOccurrences: [
        {
          sourceGenerationKey: "task-fixed:2026-05-01",
          scheduledDate: new Date("2026-05-03"),
          dueDate: new Date("2026-05-03"),
          assignedMemberId: "A",
          status: "rescheduled",
          isManuallyModified: true,
        },
      ],
      rangeStart: new Date("2026-05-01"),
      rangeEnd: new Date("2026-05-20"),
    });

    const occMay8 = generated.find(o => o.sourceGenerationKey === "task-fixed:2026-05-08");
    expect(occMay8).toBeDefined();
    expect(isoDate(occMay8!.scheduledDate)).toBe("2026-05-08");
  });

  it("SLIDING: supports multiple locked occurrences and picks the latest as base", () => {
    const startsOn = new Date("2026-05-01");
    
    const generated = generateOccurrences({
      template: {
        id: "task-multi",
        householdId: "h1",
        title: "Multi Sliding",
        estimatedMinutes: 30,
        startsOn,
        recurrence: {
          type: "every_x_days",
          mode: "SLIDING",
          interval: 7,
          anchorDate: startsOn,
        },
        assignment: {
          mode: "strict_alternation",
          eligibleMemberIds: ["A", "B"],
          rotationOrder: ["A", "B"],
        },
      },
      members,
      absences: [],
      existingOccurrences: [
        {
          sourceGenerationKey: "task-multi:sliding:0",
          scheduledDate: new Date("2026-05-01"),
          dueDate: new Date("2026-05-01"),
          assignedMemberId: "A",
          status: "completed",
        },
        {
          sourceGenerationKey: "task-multi:sliding:1",
          scheduledDate: new Date("2026-05-10"), // Completed late (expected was 8th)
          dueDate: new Date("2026-05-10"),
          assignedMemberId: "B",
          status: "completed",
        },
      ],
      rangeStart: new Date("2026-05-01"),
      rangeEnd: new Date("2026-05-31"),
    });

    const occ2 = generated.find(o => o.sourceGenerationKey === "task-multi:sliding:2");
    expect(isoDate(occ2!.scheduledDate)).toBe("2026-05-17"); // 10th + 7
  });

  it("SLIDING: alternation remains consistent across slides", () => {
    const startsOn = new Date("2026-05-01");
    
    const generated = generateOccurrences({
      template: {
        id: "task-alt",
        householdId: "h1",
        title: "Alt Sliding",
        estimatedMinutes: 30,
        startsOn,
        recurrence: {
          type: "every_x_days",
          mode: "SLIDING",
          interval: 7,
          anchorDate: startsOn,
        },
        assignment: {
          mode: "strict_alternation",
          eligibleMemberIds: ["A", "B"],
          rotationOrder: ["A", "B"],
        },
      },
      members,
      absences: [],
      existingOccurrences: [
        {
          sourceGenerationKey: "task-alt:sliding:0",
          scheduledDate: new Date("2026-05-03"), // Index 0 assigned to A
          dueDate: new Date("2026-05-03"),
          assignedMemberId: "A",
          status: "completed",
        },
      ],
      rangeStart: new Date("2026-05-01"),
      rangeEnd: new Date("2026-05-31"),
    });

    const occ1 = generated.find(o => o.sourceGenerationKey === "task-alt:sliding:1");
    expect(occ1?.assignedMemberId).toBe("B"); // Next should be B
    
    const occ2 = generated.find(o => o.sourceGenerationKey === "task-alt:sliding:2");
    expect(occ2?.assignedMemberId).toBe("A"); // Then A again
  });

  it("SLIDING: early completion shifts the NEXT occurrence relative to completedAt", () => {
    const startsOn = new Date("2026-05-01"); // Friday
    
    // Scenario: Every 7 days. Scheduled for May 8th.
    // BUT completed early on May 5th (Tuesday).
    // The next one should be May 12th (Tuesday).
    
    const generated = generateOccurrences({
      template: {
        id: "task-early",
        householdId: "h1",
        title: "Early Sliding",
        estimatedMinutes: 30,
        startsOn,
        recurrence: {
          type: "every_x_days",
          mode: "SLIDING",
          interval: 7,
          anchorDate: startsOn,
        },
        assignment: {
          mode: "strict_alternation",
          eligibleMemberIds: ["A", "B"],
          rotationOrder: ["A", "B"],
        },
      },
      members,
      absences: [],
      existingOccurrences: [
        {
          sourceGenerationKey: "task-early:sliding:0",
          scheduledDate: new Date("2026-05-05"), // Aligned with completedAt by our new service logic
          dueDate: new Date("2026-05-05"),
          assignedMemberId: "A",
          status: "completed",
        },
      ],
      rangeStart: new Date("2026-05-01"),
      rangeEnd: new Date("2026-05-31"),
    });

    const occ1 = generated.find(o => o.sourceGenerationKey === "task-early:sliding:1");
    expect(isoDate(occ1!.scheduledDate)).toBe("2026-05-12"); // 5th + 7 = 12th
  });

  it("SLIDING: rebalances correctly with 'least_assigned_minutes' when dates shift", () => {
    const startsOn = new Date("2026-05-01");
    
    // Alice has 60 mins of other tasks, Bob has 0.
    // If a task slides into a window where Alice is already busy, Bob should get it.
    
    const generated = generateOccurrences({
      template: {
        id: "task-fair",
        householdId: "h1",
        title: "Fair Sliding",
        estimatedMinutes: 30,
        startsOn,
        recurrence: {
          type: "every_x_days",
          mode: "SLIDING",
          interval: 2,
          anchorDate: startsOn,
        },
        assignment: {
          mode: "least_assigned_minutes",
          eligibleMemberIds: ["A", "B"],
          fairnessWindowDays: 7,
        },
      },
      members: [
        { id: "A", displayName: "Alice", isActive: true, weightingFactor: 1 },
        { id: "B", displayName: "Bob", isActive: true, weightingFactor: 1 },
      ],
      absences: [],
      existingOccurrences: [
        {
          sourceGenerationKey: "other-task:2026-05-03",
          scheduledDate: new Date("2026-05-03"),
          dueDate: new Date("2026-05-03"),
          assignedMemberId: "A",
          status: "completed",
          actualMinutes: 60,
        },
        {
          sourceGenerationKey: "task-fair:sliding:0",
          scheduledDate: new Date("2026-05-01"),
          dueDate: new Date("2026-05-01"),
          assignedMemberId: "B",
          status: "completed",
        }
      ],
      rangeStart: new Date("2026-05-01"),
      rangeEnd: new Date("2026-05-05"),
    });

    const occ1 = generated.find(o => o.sourceGenerationKey === "task-fair:sliding:1");
    // Date should be May 3rd (1st + 2). 
    // On May 3rd, Alice has 60 mins, Bob has 0 (from other tasks in window).
    // So Bob should be picked.
    expect(occ1?.assignedMemberId).toBe("B");
  });
});
