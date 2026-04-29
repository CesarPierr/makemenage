"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { todayDateInput } from "@/lib/date-input";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

type EntryFormProps = {
  householdId: string;
  boxId: string;
  defaultType?: "deposit" | "withdrawal";
  onSuccess?: () => void;
};

export function EntryForm({ householdId, boxId, defaultType = "deposit", onSuccess }: EntryFormProps) {
  const [type, setType] = useState<"deposit" | "withdrawal">(defaultType);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => todayDateInput());

  const { submit, isSubmitting } = useFormAction({
    action: `/api/households/${householdId}/savings/boxes/${boxId}/entries`,
    successMessage: type === "deposit" ? "Versement enregistré." : "Retrait enregistré.",
    errorMessage: "Impossible d'enregistrer ce mouvement.",
    onSuccess: () => {
      setAmount("");
      setReason("");
      onSuccess?.();
    },
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!amount.trim()) return;
    const fd = new FormData();
    fd.set("type", type);
    fd.set("amount", amount);
    fd.set("occurredOn", occurredOn);
    if (reason.trim()) fd.set("reason", reason);
    await submit(fd);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType("deposit")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            type === "deposit"
              ? "bg-[var(--leaf-500,#3F7E66)] text-white"
              : "bg-black/[0.04] text-[var(--ink-700)]",
          )}
        >
          <ArrowDown className="size-4" />
          Déposer
        </button>
        <button
          type="button"
          onClick={() => setType("withdrawal")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            type === "withdrawal"
              ? "bg-[var(--coral-500)] text-white"
              : "bg-black/[0.04] text-[var(--ink-700)]",
          )}
        >
          <ArrowUp className="size-4" />
          Retirer
        </button>
      </div>

      <label className="field-label">
        <span>Montant (€)</span>
        <input
          className="field"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>

      <label className="field-label">
        <span>Date</span>
        <input
          className="field"
          type="date"
          value={occurredOn}
          onChange={(e) => setOccurredOn(e.target.value)}
          required
        />
      </label>

      <label className="field-label">
        <span>Raison (facultatif)</span>
        <input
          className="field"
          type="text"
          placeholder="Ex : courses, prime…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={280}
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting || !amount.trim()}
        className="btn-primary w-full px-4 py-3 font-semibold disabled:opacity-50"
      >
        {isSubmitting ? "Enregistrement…" : "Valider"}
      </button>
    </form>
  );
}
