import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
}));

const schedulingMocks = vi.hoisted(() => ({
  syncHouseholdOccurrences: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  householdMemberFindMany: vi.fn(),
  householdMemberFindFirst: vi.fn(),
  recurrenceRuleCreate: vi.fn(),
  assignmentRuleCreate: vi.fn(),
  taskTemplateCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: authMocks.requireUser,
}));

vi.mock("@/lib/scheduling/service", () => ({
  syncHouseholdOccurrences: schedulingMocks.syncHouseholdOccurrences,
}));

vi.mock("@/lib/db", () => ({
  db: {
    householdMember: {
      findMany: dbMocks.householdMemberFindMany,
      findFirst: dbMocks.householdMemberFindFirst,
    },
    recurrenceRule: {
      create: dbMocks.recurrenceRuleCreate,
    },
    assignmentRule: {
      create: dbMocks.assignmentRuleCreate,
    },
    taskTemplate: {
      create: dbMocks.taskTemplateCreate,
    },
  },
}));

vi.mock("server-only", () => ({}));

import { POST as createTaskPost } from "@/app/api/tasks/route";

function buildFormRequest(url: string, fields: Record<string, string | string[]>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
      continue;
    }
    params.set(key, value);
  }

  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
}

describe("tasks route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.requireUser.mockResolvedValue({ id: "user-1" });
    dbMocks.householdMemberFindMany.mockResolvedValue([
      { id: "clh9x8j0a0001f7a8h1b2c3d" },
      { id: "clh9x8j0a0002f7a8h1b2c3d" },
    ]);
    dbMocks.householdMemberFindFirst.mockResolvedValue({
      id: "clh9x8j0a0003f7a8h1b2c3d",
      role: "owner",
      householdId: "clh9x8j0a0000f7a8h1b2c3d",
      userId: "user-1",
    });
    dbMocks.recurrenceRuleCreate.mockResolvedValue({ id: "rec-1" });
    dbMocks.assignmentRuleCreate.mockResolvedValue({ id: "assign-1" });
    dbMocks.taskTemplateCreate.mockResolvedValue({ id: "task-1" });
    schedulingMocks.syncHouseholdOccurrences.mockResolvedValue(undefined);
  });

  it("falls back to all household members when none are selected", async () => {
    const response = await createTaskPost(
      buildFormRequest("http://localhost:3000/api/tasks", {
        householdId: "clh9x8j0a0000f7a8h1b2c3d",
        title: "Nettoyage cuisine",
        estimatedMinutes: "30",
        startsOn: "2026-04-22",
        recurrenceType: "every_x_days",
        interval: "3",
        assignmentMode: "strict_alternation",
      }),
    );

    expect(response.status).toBe(303);
    expect(dbMocks.assignmentRuleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eligibleMemberIds: ["clh9x8j0a0001f7a8h1b2c3d", "clh9x8j0a0002f7a8h1b2c3d"],
          rotationOrder: ["clh9x8j0a0001f7a8h1b2c3d", "clh9x8j0a0002f7a8h1b2c3d"],
        }),
      }),
    );
    expect(schedulingMocks.syncHouseholdOccurrences).toHaveBeenCalledWith(
      "clh9x8j0a0000f7a8h1b2c3d",
    );
  });
});
