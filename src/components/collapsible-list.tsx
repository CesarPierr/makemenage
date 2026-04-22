"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

type CollapsibleListProps = {
  items: React.ReactNode[];
  initialCount: number;
  label?: string;
};

export function CollapsibleList({ items, initialCount, label = "Afficher plus" }: CollapsibleListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleItems = useMemo(() => items.slice(0, initialCount), [items, initialCount]);
  const hiddenItems = useMemo(() => items.slice(initialCount), [items, initialCount]);

  if (hiddenItems.length === 0) {
    return <div className="space-y-4">{visibleItems}</div>;
  }

  return (
    <div className="space-y-4">
      {visibleItems}
      
      {!isExpanded ? (
        <button
          className="btn-quiet group mt-2 flex w-full flex-col items-center justify-center gap-1 py-4 transition-all"
          onClick={() => setIsExpanded(true)}
          type="button"
        >
          <span className="text-sm font-bold text-[var(--sky-600)]">
            {label} ({hiddenItems.length})
          </span>
          <ChevronDown className="size-5 text-[var(--sky-400)] transition-transform group-hover:translate-y-1" />
        </button>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {hiddenItems}
          <button
            className="btn-quiet group mt-2 flex w-full flex-col items-center justify-center gap-1 py-2 opacity-60 hover:opacity-100"
            onClick={() => setIsExpanded(false)}
            type="button"
          >
            <ChevronDown className="size-4 rotate-180 text-[var(--sky-400)]" />
            <span className="text-xs font-bold text-[var(--sky-600)]">Masquer</span>
          </button>
        </div>
      )}
    </div>
  );
}
