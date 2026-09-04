import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  taskTemplateFindMany: vi.fn(),
  assignmentRuleUpdate: vi.fn(),
  householdFindUnique: vi.fn(),
  taskOccurrenceFindUnique: vi.fn(),
  taskOccurrenceFindFirst: vi.fn(),
  taskOccurrenceFindMany: vi.fn(),
  taskOccurrenceCreate: vi.fn(),
  taskOccurrenceUpdate: vi.fn(),
  taskOccurrenceUpdateMany: vi.fn(),
  recurrenceRuleUpdate: vi.fn(),
  occurrenceActionLogCreate: vi.fn(),
  occurrenceActionLogFindFirst: vi.fn(),
  householdHolidayFindMany: vi.fn().mockResolvedValue([]),
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
    taskOccurrence: {
      findUnique: dbMocks.taskOccurrenceFindUnique,
      findFirst: dbMocks.taskOccurrenceFindFirst,
      findMany: dbMocks.taskOccurrenceFindMany,
      create: dbMocks.taskOccurrenceCreate,
      update: dbMocks.taskOccurrenceUpdate,
      updateMany: dbMocks.taskOccurrenceUpdateMany,
    },
    recurrenceRule: {
      update: dbMocks.recurrenceRuleUpdate,
    },
    occurrenceActionLog: {
      create: dbMocks.occurrenceActionLogCreate,
      findFirst: dbMocks.occurrenceActionLogFindFirst,
    },
    householdHoliday: {
      findMany: dbMocks.householdHolidayFindMany,
    },
  },
}));

import { addDays, startOfDay } from "date-fns";

import { generateOccurrences } from "@/lib/scheduling/generator";
import { mapAbsences, mapAssignmentRule, mapMembers, mapRecurrenceRule } from "@/lib/scheduling/mappers";
import {
  addMemberToExistingAssignments,
  completeOccurrence,
  realignOverdueRecurrences,
  reopenOccurrence,
  syncHouseholdOccurrences,
} from "@/lib/scheduling/service";
import { getGenerationWindow } from "@/lib/time";

describe("scheduling service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.taskOccurrenceFindFirst.mockResolvedValue(null);
    dbMocks.taskOccurrenceFindMany.mockResolvedValue([]);
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

describe("realignOverdueRecurrences", () => {
  it("moves an overdue recurrence anchor once per day, not once per page load", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T12:00:00Z"));

    const makeTask = (anchorDate: Date) => ({
      id: "tpl-overdue",
      recurrenceRule: {
        id: "rule-overdue",
        type: "every_x_days" as const,
        mode: "FIXED" as const,
        interval: 7,
        weekdays: [],
        dayOfMonth: null,
        anchorDate,
        dueOffsetDays: 0,
        config: null,
      },
    });

    dbMocks.taskTemplateFindMany
      .mockResolvedValueOnce([makeTask(new Date("2026-08-01"))])
      .mockResolvedValueOnce([makeTask(new Date("2026-09-11"))]);
    dbMocks.taskOccurrenceFindFirst
      .mockResolvedValueOnce({ scheduledDate: new Date("2026-09-02") })
      .mockResolvedValueOnce({ scheduledDate: new Date("2026-09-03") })
      .mockResolvedValueOnce({ scheduledDate: new Date("2026-09-02") })
      .mockResolvedValueOnce({ scheduledDate: new Date("2026-09-11") });

    try {
      await realignOverdueRecurrences("house-1");
      await realignOverdueRecurrences("house-1");
    } finally {
      vi.useRealTimers();
    }

    expect(dbMocks.recurrenceRuleUpdate).toHaveBeenCalledTimes(1);
    expect(dbMocks.recurrenceRuleUpdate).toHaveBeenCalledWith({
      where: { id: "rule-overdue" },
      data: { anchorDate: startOfDay(new Date(2026, 8, 11)) },
    });
  });

  it("repairs a drifted future anchor when no successor row remains", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T12:00:00Z"));

    dbMocks.taskTemplateFindMany.mockResolvedValueOnce([{
      id: "tpl-overdue",
      recurrenceRule: {
        id: "rule-overdue",
        type: "every_x_days" as const,
        mode: "SLIDING" as const,
        interval: 7,
        weekdays: [],
        dayOfMonth: null,
        anchorDate: new Date("2026-12-01"),
        dueOffsetDays: 0,
        config: null,
      },
    }]);
    dbMocks.taskOccurrenceFindFirst
      .mockResolvedValueOnce({ scheduledDate: new Date("2026-09-02") })
      .mockResolvedValueOnce(null);

    try {
      await realignOverdueRecurrences("house-1");
    } finally {
      vi.useRealTimers();
    }

    expect(dbMocks.recurrenceRuleUpdate).toHaveBeenCalledWith({
      where: { id: "rule-overdue" },
      data: { anchorDate: startOfDay(new Date(2026, 8, 11)) },
    });
  });
});

describe("reopenOccurrence", () => {
  it("resets completion and skipped metadata then logs the edit", async () => {
    dbMocks.taskOccurrenceFindUnique.mockResolvedValue({
      id: "occ-1",
      status: "completed",
      scheduledDate: new Date("2099-02-10"),
      completedAt: new Date("2099-02-11"),
      completedByMemberId: "member-1",
      actualMinutes: 35,
      notes: "fait",
    });
    dbMocks.taskOccurrenceUpdate.mockResolvedValue({
      id: "occ-1",
    });
    dbMocks.occurrenceActionLogFindFirst.mockResolvedValue(null);

    await reopenOccurrence({
      occurrenceId: "occ-1",
      actorMemberId: "member-2",
    });

    expect(dbMocks.taskOccurrenceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "occ-1" },
        data: expect.objectContaining({
          status: "planned",
          completedAt: null,
          completedByMemberId: null,
          actualMinutes: null,
        }),
      }),
    );
    expect(dbMocks.occurrenceActionLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          occurrenceId: "occ-1",
          actionType: "edited",
          actorMemberId: "member-2",
        }),
      }),
    );
  });
});

describe("completeOccurrence (offline replay idempotency)", () => {
  it("no-ops when already completed and the replay carries no new details", async () => {
    dbMocks.taskOccurrenceFindUnique.mockResolvedValue({
      id: "occ-1",
      status: "completed",
      scheduledDate: new Date("2099-02-10"),
      completedAt: new Date("2099-02-11"),
      completedByMemberId: "member-1",
      actualMinutes: null,
      notes: null,
      wasCompletedAlone: false,
      taskTemplateId: "tpl-1",
      taskTemplate: { recurrenceRule: { mode: "FIXED" } },
    });

    // A queued offline "complete" gets re-sent on reconnect; replaying it must
    // not append a second action log or re-realign the recurrence.
    await completeOccurrence({ occurrenceId: "occ-1", actorMemberId: "member-1" });

    expect(dbMocks.taskOccurrenceUpdate).not.toHaveBeenCalled();
    expect(dbMocks.occurrenceActionLogCreate).not.toHaveBeenCalled();
  });
});

describe("syncHouseholdOccurrences (SLIDING slot idempotence)", () => {
  it("re-binds a stale-keyed occurrence to its slot instead of materialising a duplicate", async () => {
    // Reproduces the dishwasher-task bug: a SLIDING `:sliding:<index>` key drifts when
    // the base moves, so the same calendar slot maps to a new key. Before the fix the
    // engine created a duplicate (and orphan-cancelled the old row); now it re-binds.
    const anchor = startOfDay(new Date());
    const recurrenceRule = {
      type: "monthly_simple" as const,
      mode: "SLIDING" as const,
      interval: 1,
      weekdays: [],
      dayOfMonth: null,
      anchorDate: anchor,
      dueOffsetDays: 1,
    };
    const assignmentRule = {
      mode: "fixed" as const,
      eligibleMemberIds: ["M"],
      fixedMemberId: "M",
      rotationOrder: ["M"],
      fairnessWindowDays: null,
      preserveRotationOnSkip: false,
      preserveRotationOnReschedule: false,
      rebalanceOnMemberAbsence: false,
      lockAssigneeAfterGeneration: false,
    };
    const members = [{ id: "M", displayName: "M", isActive: true, weightingFactor: 1, availabilities: [] }];

    // Compute exactly what the generator will produce for this template (same window).
    const { start, end } = getGenerationWindow();
    const generated = generateOccurrences({
      template: {
        id: "tpl-1",
        householdId: "house-1",
        title: "Nettoyage lave vaisselle",
        estimatedMinutes: 10,
        startsOn: addDays(anchor, -1),
        endsOn: null,
        lastCompletedAt: null,
        recurrence: mapRecurrenceRule(recurrenceRule),
        assignment: mapAssignmentRule(assignmentRule),
      },
      members: mapMembers(members),
      absences: mapAbsences(members),
      existingOccurrences: [],
      rangeStart: start,
      rangeEnd: end,
    });
    expect(generated.length).toBeGreaterThan(0);

    // Seed an existing planned occurrence for every generated slot, all key-correct
    // EXCEPT the first, which carries a drifted/stale sliding key.
    const STALE_KEY = "tpl-1:sliding:9999";
    const occurrences = generated.map((g, i) => ({
      id: `occ-${i}`,
      sourceGenerationKey: i === 0 ? STALE_KEY : g.sourceGenerationKey,
      scheduledDate: g.scheduledDate,
      dueDate: g.dueDate,
      assignedMemberId: g.assignedMemberId,
      status: "planned" as const,
      actualMinutes: null,
      isManuallyModified: false,
    }));

    dbMocks.householdFindUnique.mockResolvedValue({
      id: "house-1",
      members,
      tasks: [
        {
          id: "tpl-1",
          householdId: "house-1",
          title: "Nettoyage lave vaisselle",
          estimatedMinutes: 10,
          startsOn: addDays(anchor, -1),
          endsOn: null,
          lastCompletedAt: null,
          isActive: true,
          recurrenceRule,
          assignmentRule,
          occurrences,
        },
      ],
    });
    dbMocks.taskOccurrenceCreate.mockResolvedValue({ id: "should-not-be-created" });
    dbMocks.taskOccurrenceUpdate.mockResolvedValue({ id: "occ-0" });
    dbMocks.taskOccurrenceUpdateMany.mockResolvedValue({ count: 0 });

    await syncHouseholdOccurrences("house-1");

    // No duplicate row materialised, and the stale-keyed slot is re-bound + re-keyed.
    expect(dbMocks.taskOccurrenceCreate).not.toHaveBeenCalled();
    expect(dbMocks.taskOccurrenceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "occ-0" },
        data: expect.objectContaining({ sourceGenerationKey: generated[0].sourceGenerationKey }),
      }),
    );
  });

  it("survives a sourceGenerationKey collision on create and still refreshes later occurrences", async () => {
    // The real prod incident: a create hit a unique-key collision (a sliding slot
    // whose key belongs to a row outside the 45-day window). It aborted the whole
    // sync, so no occurrence's status ever transitioned planned→overdue.
    const anchor = startOfDay(new Date());
    const recurrenceRule = {
      type: "every_x_days" as const,
      mode: "FIXED" as const,
      interval: 7,
      weekdays: [],
      dayOfMonth: null,
      anchorDate: addDays(anchor, -14),
      dueOffsetDays: 1,
    };
    const assignmentRule = {
      mode: "fixed" as const,
      eligibleMemberIds: ["M"],
      fixedMemberId: "M",
      rotationOrder: ["M"],
      fairnessWindowDays: null,
      preserveRotationOnSkip: false,
      preserveRotationOnReschedule: false,
      rebalanceOnMemberAbsence: false,
      lockAssigneeAfterGeneration: false,
    };
    const members = [{ id: "M", displayName: "M", isActive: true, weightingFactor: 1, availabilities: [] }];

    const { start, end } = getGenerationWindow();
    const generated = generateOccurrences({
      template: {
        id: "tpl-1",
        householdId: "house-1",
        title: "T",
        estimatedMinutes: 10,
        startsOn: addDays(anchor, -1),
        endsOn: null,
        lastCompletedAt: null,
        recurrence: mapRecurrenceRule(recurrenceRule),
        assignment: mapAssignmentRule(assignmentRule),
      },
      members: mapMembers(members),
      absences: mapAbsences(members),
      existingOccurrences: [],
      rangeStart: start,
      rangeEnd: end,
    });
    expect(generated.length).toBeGreaterThan(1);

    // Seed an existing row ONLY for the LAST slot (with a different assignee so it
    // needs an update). Earlier slots have no existing row → create → collision.
    const last = generated[generated.length - 1];
    const occurrences = [
      {
        id: "occ-last",
        sourceGenerationKey: last.sourceGenerationKey,
        scheduledDate: last.scheduledDate,
        dueDate: last.dueDate,
        assignedMemberId: "SOMEONE-ELSE",
        status: "planned" as const,
        actualMinutes: null,
        isManuallyModified: false,
      },
    ];

    dbMocks.householdFindUnique.mockResolvedValue({
      id: "house-1",
      members,
      tasks: [
        {
          id: "tpl-1",
          householdId: "house-1",
          title: "T",
          estimatedMinutes: 10,
          startsOn: addDays(anchor, -1),
          endsOn: null,
          lastCompletedAt: null,
          isActive: true,
          recurrenceRule,
          assignmentRule,
          occurrences,
        },
      ],
    });
    // Every create collides on the unique sourceGenerationKey (row exists out of window).
    dbMocks.taskOccurrenceCreate.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed on the fields: (`sourceGenerationKey`)"), { code: "P2002" }),
    );
    dbMocks.taskOccurrenceUpdate.mockResolvedValue({ id: "occ-last" });
    dbMocks.taskOccurrenceUpdateMany.mockResolvedValue({ count: 0 });

    // Must NOT throw, and must still reach + update the later occurrence.
    await expect(syncHouseholdOccurrences("house-1")).resolves.toBeUndefined();
    expect(dbMocks.taskOccurrenceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "occ-last" } }),
    );
  });

  it("uses the latest locked occurrence even after it leaves the history window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T12:00:00Z"));

    const members = [{ id: "M", displayName: "M", isActive: true, weightingFactor: 1, availabilities: [] }];
    const recurrenceRule = {
      id: "rule-history",
      type: "every_x_days" as const,
      mode: "SLIDING" as const,
      interval: 7,
      weekdays: [],
      dayOfMonth: null,
      anchorDate: new Date("2026-01-01"),
      dueOffsetDays: 0,
      config: null,
    };
    const assignmentRule = {
      id: "assignment-history",
      mode: "fixed" as const,
      eligibleMemberIds: ["M"],
      fixedMemberId: "M",
      rotationOrder: ["M"],
      fairnessWindowDays: null,
      preserveRotationOnSkip: true,
      preserveRotationOnReschedule: true,
      rebalanceOnMemberAbsence: false,
      lockAssigneeAfterGeneration: true,
    };
    const historicalLocked = {
      id: "occ-history",
      taskTemplateId: "tpl-history",
      sourceGenerationKey: "tpl-history:sliding:4",
      scheduledDate: new Date("2026-08-05"),
      dueDate: new Date("2026-08-05"),
      assignedMemberId: "M",
      status: "completed" as const,
      actualMinutes: null,
      isManuallyModified: true,
      createdAt: new Date("2026-08-05"),
    };

    dbMocks.householdFindUnique.mockResolvedValue({
      id: "house-1",
      members,
      tasks: [{
        id: "tpl-history",
        householdId: "house-1",
        title: "Historique",
        estimatedMinutes: 10,
        startsOn: new Date("2026-01-01"),
        endsOn: null,
        lastCompletedAt: new Date("2026-08-05"),
        isActive: true,
        recurrenceRule,
        assignmentRule,
        occurrences: [],
      }],
    });
    dbMocks.taskOccurrenceFindMany.mockResolvedValue([historicalLocked]);
    dbMocks.taskOccurrenceCreate.mockImplementation(async ({ data }) => ({ id: data.sourceGenerationKey }));

    try {
      await syncHouseholdOccurrences("house-1");
    } finally {
      vi.useRealTimers();
    }

    expect(dbMocks.taskOccurrenceCreate).toHaveBeenCalled();
    expect(dbMocks.taskOccurrenceCreate.mock.calls[0]?.[0].data).toEqual(
      expect.objectContaining({
        sourceGenerationKey: "tpl-history:sliding:5",
        scheduledDate: startOfDay(new Date(2026, 7, 12)),
      }),
    );
  });

  it("reuses a stale cancelled sliding row instead of dropping the generated slot", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T12:00:00Z"));

    const baseOccurrence = {
      id: "occ-base",
      taskTemplateId: "tpl-rebind",
      sourceGenerationKey: "tpl-rebind:sliding:2",
      scheduledDate: new Date("2026-08-05"),
      dueDate: new Date("2026-08-05"),
      assignedMemberId: "M",
      status: "completed" as const,
      actualMinutes: null,
      isManuallyModified: true,
      createdAt: new Date("2026-08-05"),
    };
    const staleCancelled = {
      ...baseOccurrence,
      id: "occ-stale",
      sourceGenerationKey: "tpl-rebind:sliding:3",
      scheduledDate: new Date("2026-07-20"),
      status: "cancelled" as const,
      isManuallyModified: false,
    };
    const members = [{ id: "M", displayName: "M", isActive: true, weightingFactor: 1, availabilities: [] }];
    const recurrenceRule = {
      id: "rule-rebind",
      type: "every_x_days" as const,
      mode: "SLIDING" as const,
      interval: 7,
      weekdays: [],
      dayOfMonth: null,
      anchorDate: new Date("2026-01-01"),
      dueOffsetDays: 0,
      config: null,
    };
    const assignmentRule = {
      id: "assignment-rebind",
      mode: "fixed" as const,
      eligibleMemberIds: ["M"],
      fixedMemberId: "M",
      rotationOrder: ["M"],
      fairnessWindowDays: null,
      preserveRotationOnSkip: true,
      preserveRotationOnReschedule: true,
      rebalanceOnMemberAbsence: false,
      lockAssigneeAfterGeneration: true,
    };

    dbMocks.householdFindUnique.mockResolvedValue({
      id: "house-1",
      members,
      tasks: [{
        id: "tpl-rebind",
        householdId: "house-1",
        title: "Rebind",
        estimatedMinutes: 10,
        startsOn: new Date("2026-01-01"),
        endsOn: null,
        lastCompletedAt: new Date("2026-08-05"),
        isActive: true,
        recurrenceRule,
        assignmentRule,
        occurrences: [baseOccurrence],
      }],
    });
    dbMocks.taskOccurrenceFindMany
      .mockResolvedValueOnce([baseOccurrence])
      .mockResolvedValueOnce([staleCancelled]);
    dbMocks.taskOccurrenceUpdate.mockResolvedValue({ id: "occ-stale" });

    try {
      await syncHouseholdOccurrences("house-1");
    } finally {
      vi.useRealTimers();
    }

    expect(
      dbMocks.taskOccurrenceCreate.mock.calls.some(
        ([input]) => input.data.sourceGenerationKey === "tpl-rebind:sliding:3",
      ),
    ).toBe(false);
    expect(dbMocks.taskOccurrenceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "occ-stale" },
        data: expect.objectContaining({
          sourceGenerationKey: "tpl-rebind:sliding:3",
          scheduledDate: startOfDay(new Date(2026, 7, 12)),
        }),
      }),
    );
  });
});
