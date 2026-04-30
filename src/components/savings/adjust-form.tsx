"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

import { todayDateInput } from "@/lib/date-input";
import { formatCurrency } from "@/lib/savings/currency";
import { useFormAction } from "@/lib/use-form-action";

type AdjustFormProps = {
  householdId: string;
  boxId: string;
  currentBalance: number;
  onSuccess?: () => void;
};

export function AdjustForm({ householdId, boxId, currentBalance, onSuccess }: AdjustFormProps) {
  const [targetAmount, setTargetAmount] = useState(currentBalance.toFixed(2).replace(".", ","));
  const [occurredOn, setOccurredOn] = useState(() => todayDateInput());
  const [reason, setReason] = useState("");

  const { submit, isSubmitting } = useFormAction({
    action: `/api/households/${householdId}/savings/boxes/${boxId}/adjust`,
    successMessage: "Solde ajusté.",
    errorMessage: "Ajustement impossible.",
    onSuccess: () => onSuccess?.(),
  });

  const parsedTarget = Number.parseFloat(targetAmount.replace(",", "."));
  const delta = Number.isFinite(parsedTarget)
    ? Math.round((parsedTarget - currentBalance) * 100) / 100
    : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!Number.isFinite(parsedTarget)) return;
    const fd = new FormData();
    fd.set("targetAmount", targetAmount);
    fd.set("occurredOn", occurredOn);
    if (reason.trim()) fd.set("reason", reason);
    await submit(fd);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-xs text-ink-700">
        Mettez le solde à jour pour qu&apos;il corresponde à votre compte bancaire. Un mouvement
        d&apos;ajustement sera créé pour combler l&apos;écart.
      </p>

      <label className="field-label">
        <span>Solde cible (€)</span>
        <input
          className="field"
          type="text"
          inputMode="decimal"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
        />
      </label>

      {delta !== null && delta !== 0 ? (
        <div className="rounded-xl bg-black/[0.04] px-3 py-2 text-xs text-ink-700">
          Solde actuel : <strong>{formatCurrency(currentBalance)}</strong>
          <br />
          Ajustement créé :{" "}
          <strong className={delta > 0 ? "text-leaf-600" : "text-red-700"}>
            {delta > 0 ? "+" : ""}
            {formatCurrency(delta)}
          </strong>
        </div>
      ) : null}

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
          placeholder="Ex : rapprochement bancaire"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={280}
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting || !Number.isFinite(parsedTarget) || delta === 0}
        className="btn-primary w-full inline-flex items-center justify-center gap-2 px-4 py-3 font-semibold disabled:opacity-50"
      >
        <Calculator className="size-4" />
        {isSubmitting ? "Ajustement…" : "Ajuster le solde"}
      </button>
    </form>
  );
}
