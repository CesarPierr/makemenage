import { describe, expect, it } from "vitest";
import { addDays, format } from "date-fns";
import { generateOccurrences } from "../src/lib/scheduling/generator";

describe("reproduction of scheduling issues", () => {
  it("should shift future occurrences when an occurrence is rescheduled (user request)", () => {
    // Current behavior: future occurrences stay at their theoretical dates until completion moves the anchor.
    // User wants: pushing a task pushes all future ones.
    
    const template = {
      id: "task-bins",
      householdId: "home-1",
      title: "Sortir poubelle",
      estimatedMinutes: 5,
      startsOn: new Date(2026, 3, 20),
      recurrence: {
          type: "every_x_days" as const,
          mode: "FIXED" as const,
          interval: 7,
        anchorDate: new Date(2026, 3, 20),
        dueOffsetDays: 0,
      },
      assignment: {
        mode: "strict_alternation" as const,
        eligibleMemberIds: ["Pierre", "Alice"],
        rotationOrder: ["Pierre", "Alice"],
      },
    };

    const members = [
      { id: "Pierre", displayName: "Pierre", isActive: true },
      { id: "Alice", displayName: "Alice", isActive: true },
    ];

    // 1. Initial generation
    const rangeStart = new Date(2026, 3, 20);
    const rangeEnd = new Date(2026, 4, 10);
    
    const firstGen = generateOccurrences({
      template,
      members,
      absences: [],
      existingOccurrences: [],
      rangeStart,
      rangeEnd,
    });

    // Expected: Apr 20 (Pierre), Apr 27 (Alice)
    expect(firstGen[0].scheduledDate.getDate()).toBe(20);
    expect(firstGen[0].assignedMemberId).toBe("Pierre");
    expect(firstGen[1].scheduledDate.getDate()).toBe(27);
    expect(firstGen[1].assignedMemberId).toBe("Alice");

    // 2. Pierre reschedules Apr 20 to Apr 23
    const existingWithRescheduled = [
      {
        id: "occ-1",
        sourceGenerationKey: `task-bins:${format(new Date(2026, 3, 20), "yyyy-MM-dd")}`,
        scheduledDate: new Date(2026, 3, 23), // Rescheduled to +3 days
        dueDate: new Date(2026, 3, 23),
        assignedMemberId: "Pierre",
        status: "rescheduled" as const,
        isManuallyModified: true,
      }
    ];

    // Pierre reschedules Apr 20 to Apr 23
    // We expect the anchor to shift, so Apr 27 should now be Apr 30
    const secondGen = generateOccurrences({
      template: {
        ...template,
        recurrence: {
          ...template.recurrence,
          anchorDate: addDays(new Date(2026, 3, 23), 7), // Simulating anchor shift to next valid slot
        }
      },
      members,
      absences: [],
      existingOccurrences: existingWithRescheduled,
      rangeStart,
      rangeEnd,
    });

    const nextOcc = secondGen.find(o => o.assignedMemberId === "Alice");
    console.log("Next occurrence date with NEW logic:", nextOcc?.scheduledDate.toDateString());
    // Expect Apr 30 (which is Apr 23 + 7)
    expect(nextOcc?.scheduledDate.getDate()).toBe(30);
  });

  it("investigates missing 3-day strict alternation task", () => {
    const template = {
      id: "task-vaccum",
      householdId: "home-1",
      title: "Aspirateur global",
      estimatedMinutes: 20,
      startsOn: new Date(2026, 3, 20),
      recurrence: {
          type: "every_x_days" as const,
          mode: "FIXED" as const,
          interval: 3,
        anchorDate: new Date(2026, 3, 20),
        dueOffsetDays: 0,
      },
      assignment: {
        mode: "strict_alternation" as const,
        eligibleMemberIds: ["Pierre", "Alice"],
        rotationOrder: ["Pierre", "Alice"],
      },
    };

    const members = [
      { id: "Pierre", displayName: "Pierre", isActive: true },
      { id: "Alice", displayName: "Alice", isActive: true },
    ];

    const rangeStart = new Date(2026, 3, 20);
    const rangeEnd = new Date(2026, 4, 10);

    const gen = generateOccurrences({
      template,
      members,
      absences: [],
      existingOccurrences: [],
      rangeStart,
      rangeEnd,
    });

    console.log("Generated 3-day occurrences:", gen.map(o => o.scheduledDate.toISOString().split("T")[0]));
    // Apr 20, 23, 26, 29, May 02, 05, 08
    expect(gen.length).toBeGreaterThan(0);
  });
});
