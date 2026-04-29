"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { todayDateInput } from "@/lib/date-input";
import { formatCurrency } from "@/lib/savings/currency";
import { useFormAction } from "@/lib/use-form-action";
import type { SavingsBoxView } from "@/components/savings/types";

type TransferFormProps = {
  householdId: string;
  fromBoxId: string;
  boxes: SavingsBoxView[];
  onSuccess?: () => void;
};

export function TransferForm({
  householdId,
  fromBoxId: initialFromBoxId,
  boxes,
  onSuccess,
}: TransferFormProps) {
  const [fromBoxId, setFromBoxId] = useState(initialFromBoxId);
  const [toBoxId, setToBoxId] = useState(boxes.find((b) => b.id !== initialFromBoxId)?.id ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => todayDateInput());

  const { submit, isSubmitting } = useFormAction({
    action: `/api/households/${householdId}/savings/transfers`,
    successMessage: "Transfert enregistré.",
    errorMessage: "Transfert impossible.",
    onSuccess: () => {
      setAmount("");
      setReason("");
      onSuccess?.();
    },
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fromBoxId || !toBoxId || fromBoxId === toBoxId || !amount.trim()) return;
    const fd = new FormData();
    fd.set("fromBoxId", fromBoxId);
    fd.set("toBoxId", toBoxId);
    fd.set("amount", amount);
    fd.set("occurredOn", occurredOn);
    if (reason.trim()) fd.set("reason", reason);
    await submit(fd);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className="field-label">
          <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">De</span>
          <select
            className="field"
            value={fromBoxId}
            onChange={(e) => setFromBoxId(e.target.value)}
            required
          >
            {boxes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({formatCurrency(b.balance)})
              </option>
            ))}
          </select>
        </label>
        <div className="pb-3 text-[var(--ink-300)]">
          <ArrowRight className="size-4" />
        </div>
        <label className="field-label">
          <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Vers</span>
          <select
            className="field"
            value={toBoxId}
            onChange={(e) => setToBoxId(e.target.value)}
            required
          >
            {boxes
              .filter((b) => b.id !== fromBoxId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({formatCurrency(b.balance)})
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="field-label">
          <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Montant (€)</span>
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
          <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Date</span>
          <input
            className="field"
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="field-label">
        <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Raison (facultatif)</span>
        <input
          className="field"
          type="text"
          placeholder="Ex : virement vers vacances…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={280}
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting || !amount.trim() || !fromBoxId || !toBoxId || fromBoxId === toBoxId}
        className="btn-primary w-full px-4 py-3 font-bold shadow-md disabled:opacity-50 transition-all active:scale-[0.98]"
      >
        {isSubmitting ? "Transfert…" : "Valider le transfert"}
      </button>
    </form>
  );
}
