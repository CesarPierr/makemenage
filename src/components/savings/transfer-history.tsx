"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, Undo2 } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/savings/currency";
import { useFormAction } from "@/lib/use-form-action";

type Transfer = {
  id: string;
  fromBoxId: string;
  toBoxId: string;
  amount: string;
  occurredOn: string;
  reason: string | null;
  fromBox: { name: string; color: string };
  toBox: { name: string; color: string };
};

type TransferHistoryProps = {
  householdId: string;
  refreshKey: number;
  onChanged: () => void;
};

export function TransferHistory({ householdId, refreshKey, onChanged }: TransferHistoryProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/households/${householdId}/savings/transfers`, {
          headers: { "x-requested-with": "fetch" },
        });
        const data = await res.json();
        setTransfers(data.transfers || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [householdId, refreshKey]);

  const removeTransfer = useFormAction({
    action: confirmCancelId ? `/api/households/${householdId}/savings/transfers/${confirmCancelId}` : "",
    successMessage: "Transfert annulé.",
    errorMessage: "Annulation impossible.",
    onSuccess: () => {
      setConfirmCancelId(null);
      onChanged();
    },
  });

  if (loading && transfers.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-ink-500">
        Chargement de l&apos;historique…
      </div>
    );
  }

  if (!loading && transfers.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-ink-500">Aucun transfert pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Dialog
        isOpen={confirmCancelId !== null}
        onClose={() => setConfirmCancelId(null)}
        title="Annuler ce transfert ?"
        type="danger"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-sm font-semibold"
              onClick={() => setConfirmCancelId(null)}
            >
              Conserver
            </button>
            <button
              type="button"
              className="btn-primary bg-red-600 hover:bg-red-700 border-red-700 px-4 py-2 text-sm font-semibold"
              onClick={() => {
                const fd = new FormData();
                fd.set("_action", "delete");
                removeTransfer.submit(fd);
              }}
              disabled={removeTransfer.isSubmitting}
            >
              {removeTransfer.isSubmitting ? "Annulation…" : "Annuler le transfert"}
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Cette action rétablira le solde des deux enveloppes concernées.
        </p>
      </Dialog>

      {transfers.map((t) => (
        <div key={t.id} className="app-surface rounded-2xl p-4 shadow-sm border border-black/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
              {format(new Date(t.occurredOn), "d MMMM yyyy", { locale: fr })}
            </span>
            <span className="text-sm font-bold text-ink-950">
              {formatCurrency(Number.parseFloat(t.amount))}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full shrink-0" style={{ background: t.fromBox.color }} />
                <span className="text-sm font-medium truncate">{t.fromBox.name}</span>
              </div>
            </div>
            <ArrowRight className="size-4 text-[var(--ink-300)] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full shrink-0" style={{ background: t.toBox.color }} />
                <span className="text-sm font-medium truncate">{t.toBox.name}</span>
              </div>
            </div>
          </div>

          {t.reason && (
            <p className="mt-2 text-xs text-ink-500 italic">
              « {t.reason} »
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-black/[0.04] flex justify-end">
            <button
              type="button"
              onClick={() => setConfirmCancelId(t.id)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              <Undo2 className="size-3.5" />
              Annuler ce transfert
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
