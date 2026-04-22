import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  taskTemplateFindMany: vi.fn(),
  assignmentRuleUpdate: vi.fn(),
  householdFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    taskTemplate: {
      findMany: dbMocks.taskTemplateFindMany,
    },
    assignmentRule: {
      update: dbMocks.assignmentRuleUpdate,
    },
    household: {
      findUnique: dbMocks.householdFindUnique,
    },
  },
}));

import { addMemberToExistingAssignments } from "@/lib/scheduling/service";

describe("scheduling service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.householdFindUnique.mockResolvedValue({
      id: "house-1",
      members: [],
      tasks: [],
    });
  });

  it("adds a new member to rotating and fairness-based task rules", async () => {
    dbMocks.taskTemplateFindMany.mockResolvedValue([
      {
        assignmentRuleId: "rule-1",
        assignmentRule: {
          mode: "strict_alternation",
          eligibleMemberIds: ["A", "B"],
          rotationOrder: ["A", "B"],
        },
      },
      {
        assignmentRuleId: "rule-2",
        assignmentRule: {
          mode: "least_assigned_minutes",
          eligibleMemberIds: ["A", "B"],
          rotationOrder: ["A", "B"],
        },
      },
      {
        assignmentRuleId: "rule-3",
        assignmentRule: {
          mode: "fixed",
          eligibleMemberIds: ["A"],
          rotationOrder: ["A"],
        },
      },
    ]);

    await addMemberToExistingAssignments({
      householdId: "house-1",
      memberId: "C",
    });

    expect(dbMocks.assignmentRuleUpdate).toHaveBeenCalledTimes(2);
    expect(dbMocks.assignmentRuleUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "rule-1" },
      data: {
        eligibleMemberIds: ["A", "B", "C"],
        rotationOrder: ["A", "B", "C"],
      },
    });
    expect(dbMocks.assignmentRuleUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "rule-2" },
      data: {
        eligibleMemberIds: ["A", "B", "C"],
        rotationOrder: ["A", "B", "C"],
      },
    });
  });
});
