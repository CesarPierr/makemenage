"use client";

import { EntryRow } from "@/components/savings/entry-row";
import type { SavingsEntryView } from "@/components/savings/types";

type BoxDetailHistoryProps = {
  householdId: string;
  entries: SavingsEntryView[];
  loading: boolean;
  reloadEntries: () => void;
};

export function BoxDetailHistory({
  householdId,
  entries,
  loading,
  reloadEntries,
}: BoxDetailHistoryProps) {
  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block size-6 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
          <p className="mt-2 text-xs text-ink-500">Chargement…</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center bg-black/[0.02] rounded-2xl border border-dashed border-black/10">
          <p className="text-sm text-ink-500">Aucun mouvement pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              householdId={householdId}
              onChanged={reloadEntries}
            />
          ))}
        </div>
      )}
    </div>
  );
}
