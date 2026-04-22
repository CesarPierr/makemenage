import { describe, expect, it } from "vitest";

import {
  filterHistoryLogs,
  getHistoryActionDescription,
  getHistoryActionLabel,
  summarizeHistoryLogs,
} from "@/lib/history";

describe("history helpers", () => {
  it("formats user-facing labels in French", () => {
    expect(getHistoryActionLabel("completed")).toBe("Terminée");
    expect(getHistoryActionLabel("rescheduled")).toBe("Reportée");
    expect(getHistoryActionLabel("reassigned")).toBe("Réattribuée");
  });

  it("describes manual and automatic actions clearly", () => {
    expect(
      getHistoryActionDescription({
        actionType: "completed",
        actorMember: { displayName: "Pierre" },
      }),
    ).toContain("Pierre");

    expect(
      getHistoryActionDescription({
        actionType: "created",
      }),
    ).toContain("générée automatiquement");
  });

  it("filters history logs by user-facing categories", () => {
    const logs: Array<{
      actionType: "completed" | "skipped" | "edited" | "reassigned";
      createdAt: Date;
    }> = [
      { actionType: "completed", createdAt: new Date("2026-04-22") },
      { actionType: "skipped", createdAt: new Date("2026-04-22") },
      { actionType: "edited", createdAt: new Date("2026-04-22") },
      { actionType: "reassigned", createdAt: new Date("2026-04-22") },
    ];

    expect(filterHistoryLogs(logs, "completed")).toHaveLength(1);
    expect(filterHistoryLogs(logs, "edited")).toHaveLength(2);
    expect(filterHistoryLogs(logs, "all")).toHaveLength(4);
  });

  it("summarizes counts for the overview cards", () => {
    const logs: Array<{
      actionType: "completed" | "skipped" | "rescheduled" | "edited";
      createdAt: Date;
    }> = [
      { actionType: "completed", createdAt: new Date("2026-04-22") },
      { actionType: "completed", createdAt: new Date("2026-04-22") },
      { actionType: "skipped", createdAt: new Date("2026-04-22") },
      { actionType: "rescheduled", createdAt: new Date("2026-04-22") },
      { actionType: "edited", createdAt: new Date("2026-04-22") },
    ];

    expect(
      summarizeHistoryLogs(logs),
    ).toEqual({
      completed: 2,
      skipped: 1,
      rescheduled: 1,
      edited: 1,
      total: 5,
    });
  });
});
