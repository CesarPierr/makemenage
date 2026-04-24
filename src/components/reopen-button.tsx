"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useFormAction } from "@/lib/use-form-action";

type ReopenButtonProps = {
  occurrenceId: string;
  memberId: string;
  compact?: boolean;
};

export function ReopenButton({ occurrenceId, memberId, compact = false }: ReopenButtonProps) {
  const [dismissed, setDismissed] = useState(false);
  const { submit, isSubmitting } = useFormAction({
    action: `/api/occurrences/${occurrenceId}/reopen`,
    method: "POST",
    successMessage: "Tâche remise à faire.",
    errorMessage: "Impossible de ré-ouvrir cette tâche.",
    refreshOnSuccess: true,
    onSuccess: () => setDismissed(true),
  });

  if (dismissed) return null;

  return (
    <button
      type="button"
      disabled={isSubmitting}
      aria-label="Remettre à faire"
      className={
        compact
          ? "shrink-0 flex items-center gap-1 rounded-full border border-[rgba(47,109,136,0.2)] bg-[rgba(47,109,136,0.07)] px-2.5 py-1 text-xs font-semibold text-[var(--sky-600)] transition-all hover:bg-[rgba(47,109,136,0.14)] disabled:opacity-40"
          : "flex items-center gap-1.5 rounded-xl border border-[rgba(47,109,136,0.16)] bg-[rgba(47,109,136,0.08)] px-3 py-2 text-xs font-bold text-[var(--sky-600)] transition-all active:scale-[0.97] disabled:opacity-40"
      }
      onClick={async () => {
        const fd = new FormData();
        fd.append("memberId", memberId);
        await submit(fd);
      }}
    >
      <RotateCcw className={compact ? "size-3" : "size-3.5"} aria-hidden="true" />
      {isSubmitting ? "…" : "Ré-ouvrir"}
    </button>
  );
}
