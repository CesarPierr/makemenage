"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Pencil, Trash2, X, Check } from "lucide-react";

import { formatSignedCurrency } from "@/lib/savings/currency";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";
import type { SavingsEntryView } from "@/components/savings/types";

const ENTRY_LABEL: Record<SavingsEntryView["type"], string> = {
  deposit: "Versement",
  withdrawal: "Retrait",
  transfer_in: "Transfert reçu",
  transfer_out: "Transfert envoyé",
  auto_fill: "Auto-versement",
  adjustment: "Ajustement",
};

type EntryRowProps = {
  entry: SavingsEntryView;
  householdId: string;
  onChanged: () => void;
};

export function EntryRow({ entry, householdId, onChanged }: EntryRowProps) {
  const amount = Number.parseFloat(entry.amount);
  const signed = ["deposit", "transfer_in", "auto_fill"].includes(entry.type)
    ? amount
    : entry.type === "adjustment"
      ? amount
      : -amount;
  const isLocked =
    entry.transferId !== null || entry.type === "auto_fill" || entry.type === "adjustment";

  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(entry.amount);
  const [editReason, setEditReason] = useState(entry.reason ?? "");
  const [editDate, setEditDate] = useState(entry.occurredOn.slice(0, 10));

  const action = `/api/households/${householdId}/savings/entries/${entry.id}`;

  const update = useFormAction({
    action,
    successMessage: "Mouvement modifié.",
    errorMessage: "Modification impossible.",
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });

  const remove = useFormAction({
    action,
    successMessage: "Mouvement supprimé.",
    errorMessage: "Suppression impossible.",
    onSuccess: () => onChanged(),
  });

  if (editing) {
    return (
      <form
        className="rounded-xl border border-black/[0.08] bg-white p-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.set("amount", editAmount);
          fd.set("occurredOn", editDate);
          fd.set("reason", editReason);
          update.submit(fd);
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <input
            className="field text-sm"
            type="text"
            inputMode="decimal"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            required
          />
          <input
            className="field text-sm"
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            required
          />
        </div>
        <input
          className="field text-sm"
          type="text"
          placeholder="Raison"
          value={editReason}
          onChange={(e) => setEditReason(e.target.value)}
          maxLength={280}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={update.isSubmitting}
            className="btn-primary inline-flex flex-1 items-center justify-center gap-1 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            <Check className="size-3.5" />
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn-secondary inline-flex items-center justify-center gap-1 px-3 py-2 text-xs"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-black/[0.02] px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--ink-950)]">
          {ENTRY_LABEL[entry.type]}
        </p>
        <p className="text-xs text-[var(--ink-500)] truncate">
          {format(new Date(entry.occurredOn), "d MMM yyyy", { locale: fr })}
          {entry.reason ? ` · ${entry.reason}` : ""}
        </p>
      </div>
      <p
        className={cn(
          "text-sm font-bold tabular-nums",
          signed >= 0 ? "text-[var(--leaf-600)]" : "text-red-700",
        )}
      >
        {formatSignedCurrency(signed)}
      </p>
      {!isLocked ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Modifier"
            onClick={() => setEditing(true)}
            className="size-7 rounded-md text-[var(--ink-500)] transition-colors hover:bg-black/[0.06] hover:text-[var(--ink-950)] flex items-center justify-center"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Supprimer"
            disabled={remove.isSubmitting}
            onClick={() => {
              if (!window.confirm("Supprimer ce mouvement ?")) return;
              const fd = new FormData();
              fd.set("_action", "delete");
              remove.submit(fd);
            }}
            className="size-7 rounded-md text-[var(--ink-500)] transition-colors hover:bg-red-50 hover:text-red-700 flex items-center justify-center disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
