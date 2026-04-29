"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { todayDateInput } from "@/lib/date-input";
import { formatCurrency } from "@/lib/savings/currency";
import { useFormAction } from "@/lib/use-form-action";
import type { SavingsBoxView } from "@/components/savings/types";

type TransferSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  boxes: SavingsBoxView[];
  defaultFromBoxId?: string;
};

export function TransferSheet({
  isOpen,
  onClose,
  householdId,
  boxes,
  defaultFromBoxId,
}: TransferSheetProps) {
  const [fromBoxId, setFromBoxId] = useState(defaultFromBoxId ?? boxes[0]?.id ?? "");
  const [toBoxId, setToBoxId] = useState(boxes.find((b) => b.id !== defaultFromBoxId)?.id ?? "");
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
      onClose();
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Transférer">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="field-label">
            <span>De</span>
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
          <ArrowRight className="size-5 mb-3 text-[var(--ink-500)]" />
          <label className="field-label">
            <span>Vers</span>
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
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={280}
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || !amount.trim() || !fromBoxId || !toBoxId || fromBoxId === toBoxId}
          className="btn-primary w-full px-4 py-3 font-semibold disabled:opacity-50"
        >
          {isSubmitting ? "Transfert…" : "Transférer"}
        </button>
      </form>
    </BottomSheet>
  );
}
