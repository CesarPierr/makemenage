const householdSyncTimestamps = new Map<string, number>();

export function shouldSyncHouseholdContext(
  householdId: string,
  now = Date.now(),
  throttleMs = 12_000,
) {
  const lastSyncedAt = householdSyncTimestamps.get(householdId);

  if (lastSyncedAt !== undefined && now - lastSyncedAt < throttleMs) {
    return false;
  }

  householdSyncTimestamps.set(householdId, now);
  return true;
}

export function resetHouseholdContextSyncState(householdId?: string) {
  if (householdId) {
    householdSyncTimestamps.delete(householdId);
    return;
  }

  householdSyncTimestamps.clear();
}
