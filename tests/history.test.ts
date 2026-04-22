import { describe, expect, it } from "vitest";

import { getHistoryActionDescription, getHistoryActionLabel } from "@/lib/history";

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
});
