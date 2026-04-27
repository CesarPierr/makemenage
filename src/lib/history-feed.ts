import "server-only";

import type { OccurrenceActionType } from "@prisma/client";

import { db } from "@/lib/db";
import type { HistoryFilter } from "@/lib/history";

export const HISTORY_PAGE_SIZE = 30;

const FILTER_TO_ACTION_TYPES: Record<Exclude<HistoryFilter, "all">, OccurrenceActionType[]> = {
  completed: ["completed"],
  skipped: ["skipped"],
  rescheduled: ["rescheduled"],
  edited: ["edited", "reassigned", "assigned"],
};

type LoadHistoryOptions = {
  cursor?: string | null;
  filter?: HistoryFilter;
  limit?: number;
};

/**
 * Fetch a paginated slice of action logs for one household. Logs from auto
 * generation (`created`) are excluded — they are noise in the user-facing feed.
 *
 * Uses cuid-based cursor pagination ordered by `createdAt desc` with `id` as
 * tiebreaker so successive pages remain stable even when timestamps collide.
 */
export async function loadHistoryFeed(householdId: string, options: LoadHistoryOptions = {}) {
  const { cursor, filter = "all", limit = HISTORY_PAGE_SIZE } = options;

  const actionTypeFilter = filter !== "all" ? FILTER_TO_ACTION_TYPES[filter] : null;

  const logs = await db.occurrenceActionLog.findMany({
    where: {
      occurrence: { householdId },
      actionType: actionTypeFilter
        ? { in: actionTypeFilter }
        : { not: "created" },
    },
    include: {
      occurrence: { include: { taskTemplate: true } },
      actorMember: true,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, limit) : logs;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  return { items, nextCursor };
}
