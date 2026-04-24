import { describe, it, expect } from "vitest";

import { TASK_TEMPLATE_PACKS } from "@/lib/task-templates";

describe("TASK_TEMPLATE_PACKS", () => {
  it("exports at least 4 packs", () => {
    expect(TASK_TEMPLATE_PACKS.length).toBeGreaterThanOrEqual(4);
  });

  it("every pack has required fields", () => {
    for (const pack of TASK_TEMPLATE_PACKS) {
      expect(pack.id).toBeTruthy();
      expect(pack.label).toBeTruthy();
      expect(pack.tasks.length).toBeGreaterThan(0);
    }
  });

  it("every task has a valid recurrence type", () => {
    const validTypes = ["daily", "weekly", "every_x_days"];
    for (const pack of TASK_TEMPLATE_PACKS) {
      for (const task of pack.tasks) {
        expect(validTypes).toContain(task.recurrenceType);
        expect(task.recurrenceInterval).toBeGreaterThanOrEqual(1);
        expect(task.estimatedMinutes).toBeGreaterThan(0);
      }
    }
  });

  it("pack IDs are unique", () => {
    const ids = TASK_TEMPLATE_PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("couple pack has daily vaisselle", () => {
    const couple = TASK_TEMPLATE_PACKS.find((p) => p.id === "couple");
    expect(couple).toBeDefined();
    const vaisselle = couple!.tasks.find((t) => t.title === "Vaisselle");
    expect(vaisselle?.recurrenceType).toBe("daily");
  });
});
