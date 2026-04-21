import { describe, expect, it } from "vitest";

import { buildLoadMetrics } from "@/lib/analytics";

describe("analytics", () => {
  it("computes fairness deltas and completion rates", () => {
    const metrics = buildLoadMetrics(
      [
        { id: "A", displayName: "Alice", color: "#000", isActive: true },
        { id: "B", displayName: "Bob", color: "#111", isActive: true },
      ],
      [
        {
          assignedMemberId: "A",
          actualMinutes: null,
          status: "planned",
          taskTemplate: { estimatedMinutes: 40 },
        },
        {
          assignedMemberId: "A",
          actualMinutes: 25,
          status: "completed",
          taskTemplate: { estimatedMinutes: 30 },
        },
        {
          assignedMemberId: "B",
          actualMinutes: null,
          status: "completed",
          taskTemplate: { estimatedMinutes: 20 },
        },
      ],
    );

    expect(metrics.totalOccurrences).toBe(3);
    expect(metrics.byMember[0]?.plannedMinutes).toBe(65);
    expect(metrics.byMember[0]?.completionRate).toBe(50);
    expect(metrics.fairness[0]?.deltaMinutes).toBeGreaterThan(0);
    expect(metrics.fairness[1]?.deltaMinutes).toBeLessThan(0);
  });
});
