import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Rule = {
  id: string;
  boxId: string;
  amount: { toString(): string };
  type: string;
  interval: number;
  weekdays: number[] | null;
  dayOfMonth: number | null;
  anchorDate: Date;
  startsOn: Date;
  endsOn: Date | null;
  isPaused: boolean;
  lastAppliedOn: Date | null;
  box: { householdId: string; name: string };
};

const state = vi.hoisted(() => ({
  rules: [] as Rule[],
  entries: [] as Array<{ autoFillRuleId: string; autoFillKey: string; amount: string }>,
  ruleUpdates: [] as Array<{ id: string; data: { lastAppliedOn?: Date } }>,
  pushCalls: [] as Array<{ householdId: string; title: string }>,
}));

vi.mock("@/lib/push", () => ({
  sendPushToHousehold: vi.fn(async (householdId: string, payload: { title: string }) => {
    state.pushCalls.push({ householdId, title: payload.title });
    return { sent: 0, failed: 0, total: 0 };
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    savingsAutoFillRule: {
      findMany: vi.fn(async () => state.rules.filter((r) => !r.isPaused)),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { lastAppliedOn?: Date } }) => {
        state.ruleUpdates.push({ id: where.id, data });
        const r = state.rules.find((r) => r.id === where.id);
        if (r && data.lastAppliedOn) r.lastAppliedOn = data.lastAppliedOn;
        return r;
      }),
    },
    savingsEntry: {
      findMany: vi.fn(async ({ where }: { where: { boxId: string } }) =>
        state.entries
          .filter((entry) => entry.autoFillRuleId === "" || where.boxId)
          .map((entry) => ({ type: "auto_fill", amount: entry.amount })),
      ),
      create: vi.fn(async ({ data }: { data: { autoFillRuleId?: string; autoFillKey?: string; amount: string } }) => {
        const dup = state.entries.find(
          (e) => e.autoFillRuleId === data.autoFillRuleId && e.autoFillKey === data.autoFillKey,
        );
        if (dup) {
          const err = new Error("unique violation") as Error & { code: string };
          err.code = "P2002";
          throw err;
        }
        state.entries.push({
          autoFillRuleId: data.autoFillRuleId ?? "",
          autoFillKey: data.autoFillKey ?? "",
          amount: data.amount,
        });
        return data;
      }),
    },
    savingsBox: {
      findFirst: vi.fn(async () => null),
    },
  },
}));

const { runAutoFillCatchup } = await import("@/lib/savings/service");

beforeEach(() => {
  state.rules = [];
  state.entries = [];
  state.ruleUpdates = [];
  state.pushCalls = [];
});

describe("auto-fill catchup", () => {
  it("creates monthly entries between startsOn and asOf", async () => {
    state.rules.push({
      id: "rule1",
      boxId: "box1",
      amount: { toString: () => "50.00" },
      type: "monthly_simple",
      interval: 1,
      weekdays: null,
      dayOfMonth: 5,
      anchorDate: new Date(2026, 0, 5),
      startsOn: new Date(2026, 0, 1),
      endsOn: null,
      isPaused: false,
      lastAppliedOn: null,
      box: { householdId: "hh1", name: "Précaution" },
    });

    const result = await runAutoFillCatchup({
      householdId: "hh1",
      asOf: new Date(2026, 3, 29),
    });

    // Jan 5, Feb 5, Mar 5, Apr 5 = 4 fills
    expect(result.createdEntries).toBe(4);
    expect(result.affectedBoxes).toEqual(["box1"]);
    expect(state.pushCalls).toEqual([{ householdId: "hh1", title: "Versement automatique appliqué" }]);
  });

  it("is idempotent: re-running creates no duplicates", async () => {
    state.rules.push({
      id: "rule1",
      boxId: "box1",
      amount: { toString: () => "50.00" },
      type: "monthly_simple",
      interval: 1,
      weekdays: null,
      dayOfMonth: 5,
      anchorDate: new Date(2026, 0, 5),
      startsOn: new Date(2026, 0, 1),
      endsOn: null,
      isPaused: false,
      lastAppliedOn: null,
      box: { householdId: "hh1", name: "Précaution" },
    });

    await runAutoFillCatchup({ householdId: "hh1", asOf: new Date(2026, 3, 29) });
    // Reset lastAppliedOn to simulate re-running before update committed
    state.rules[0].lastAppliedOn = null;
    const second = await runAutoFillCatchup({
      householdId: "hh1",
      asOf: new Date(2026, 3, 29),
    });

    // P2002 errors swallowed; no new entries
    expect(second.createdEntries).toBe(0);
    expect(state.entries).toHaveLength(4);
  });

  it("respects lastAppliedOn — only fills missing months", async () => {
    state.rules.push({
      id: "rule1",
      boxId: "box1",
      amount: { toString: () => "50.00" },
      type: "monthly_simple",
      interval: 1,
      weekdays: null,
      dayOfMonth: 5,
      anchorDate: new Date(2026, 0, 5),
      startsOn: new Date(2026, 0, 1),
      endsOn: null,
      isPaused: false,
      lastAppliedOn: new Date(2026, 1, 5), // already applied through Feb
      box: { householdId: "hh1", name: "Précaution" },
    });

    const result = await runAutoFillCatchup({
      householdId: "hh1",
      asOf: new Date(2026, 3, 29),
    });

    // Mar 5, Apr 5 = 2 fills
    expect(result.createdEntries).toBe(2);
  });

  it("skips paused rules", async () => {
    state.rules.push({
      id: "rule1",
      boxId: "box1",
      amount: { toString: () => "50.00" },
      type: "monthly_simple",
      interval: 1,
      weekdays: null,
      dayOfMonth: 5,
      anchorDate: new Date(2026, 0, 5),
      startsOn: new Date(2026, 0, 1),
      endsOn: null,
      isPaused: true,
      lastAppliedOn: null,
      box: { householdId: "hh1", name: "Précaution" },
    });

    const result = await runAutoFillCatchup({
      householdId: "hh1",
      asOf: new Date(2026, 3, 29),
    });

    expect(result.createdEntries).toBe(0);
  });

  it("stops at endsOn", async () => {
    state.rules.push({
      id: "rule1",
      boxId: "box1",
      amount: { toString: () => "50.00" },
      type: "monthly_simple",
      interval: 1,
      weekdays: null,
      dayOfMonth: 5,
      anchorDate: new Date(2026, 0, 5),
      startsOn: new Date(2026, 0, 1),
      endsOn: new Date(2026, 1, 28), // ends in Feb
      isPaused: false,
      lastAppliedOn: null,
      box: { householdId: "hh1", name: "Précaution" },
    });

    const result = await runAutoFillCatchup({
      householdId: "hh1",
      asOf: new Date(2026, 3, 29),
    });

    // Only Jan 5 + Feb 5
    expect(result.createdEntries).toBe(2);
  });

  it("works for weekly auto-fill", async () => {
    state.rules.push({
      id: "rule1",
      boxId: "box1",
      amount: { toString: () => "10.00" },
      type: "weekly",
      interval: 1,
      weekdays: [1], // Monday
      dayOfMonth: null,
      anchorDate: new Date(2026, 3, 6), // Monday Apr 6 2026
      startsOn: new Date(2026, 3, 1),
      endsOn: null,
      isPaused: false,
      lastAppliedOn: null,
      box: { householdId: "hh1", name: "Précaution" },
    });

    const result = await runAutoFillCatchup({
      householdId: "hh1",
      asOf: new Date(2026, 3, 29), // Wed Apr 29
    });

    // Apr 6, 13, 20, 27 = 4 Mondays
    expect(result.createdEntries).toBe(4);
  });
});
