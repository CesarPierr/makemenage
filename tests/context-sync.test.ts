import { describe, expect, it } from "vitest";

import { resetHouseholdContextSyncState, shouldSyncHouseholdContext } from "@/lib/context-sync";

describe("household context sync throttle", () => {
  it("allows the first sync and prevents repeated refreshes inside the throttle window", () => {
    resetHouseholdContextSyncState();

    expect(shouldSyncHouseholdContext("house-1", 1000, 10_000)).toBe(true);
    expect(shouldSyncHouseholdContext("house-1", 5000, 10_000)).toBe(false);
    expect(shouldSyncHouseholdContext("house-1", 12_000, 10_000)).toBe(true);
  });

  it("tracks households independently", () => {
    resetHouseholdContextSyncState();

    expect(shouldSyncHouseholdContext("house-1", 1000, 10_000)).toBe(true);
    expect(shouldSyncHouseholdContext("house-2", 1001, 10_000)).toBe(true);
  });
});
