"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Archive, Download, Pencil, Settings, Trash2 } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { AdjustForm } from "@/components/savings/adjust-form";
import { BalanceChart } from "@/components/savings/balance-chart";
import { EntryForm } from "@/components/savings/entry-form";
import { EntryRow } from "@/components/savings/entry-row";
import { AutoFillForm } from "@/components/savings/auto-fill-form";
import { formatCurrency } from "@/lib/savings/currency";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";
import type { SavingsBoxView, SavingsEntryView } from "@/components/savings/types";

type Tab = "balance" | "history" | "settings";

type BoxDetailSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  box: SavingsBoxView | null;
  householdId: string;
};

function BoxDetailContent({
  box,
  householdId,
  onClose,
}: {
  box: SavingsBoxView;
  householdId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("balance");
  const [entries, setEntries] = useState<SavingsEntryView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/households/${householdId}/savings/boxes/${box.id}/entries`, {
      headers: { "x-requested-with": "fetch" },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [box.id, householdId]);

  const archive = useFormAction({
    action: box ? `/api/households/${householdId}/savings/boxes/${box.id}` : "",
    successMessage: box?.isArchived ? "Enveloppe restaurée." : "Enveloppe archivée.",
    errorMessage: "Action impossible.",
    onSuccess: () => onClose(),
  });

  const remove = useFormAction({
    action: box ? `/api/households/${householdId}/savings/boxes/${box.id}` : "",
    successMessage: "Enveloppe supprimée.",
    errorMessage: "Suppression impossible (enveloppe non vide ?).",
    onSuccess: () => onClose(),
  });

  async function reloadEntries() {
    if (!box) return;
    const res = await fetch(`/api/households/${householdId}/savings/boxes/${box.id}/entries`, {
      headers: { "x-requested-with": "fetch" },
    });
    const data = await res.json();
    setEntries(data.entries ?? []);
  }

  const target = box.targetAmount ? Number.parseFloat(box.targetAmount) : null;
  const progress = target && target > 0 ? Math.min(100, (box.balance / target) * 100) : null;

  return (
    <div className="space-y-4">
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: `${box.color}1A` }}
        >
          <p className="text-xs uppercase tracking-wide text-[var(--ink-500)]">Solde actuel</p>
          <p
            className={cn(
              "mt-1 text-4xl font-bold tabular-nums",
              box.balance < 0 ? "text-red-700" : "text-[var(--ink-950)]",
            )}
          >
            {formatCurrency(box.balance)}
          </p>
          {target ? (
            <>
              <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress ?? 0}%`, background: box.color }}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--ink-700)]">
                Objectif {formatCurrency(target)}
                {box.targetDate
                  ? ` · ${format(new Date(box.targetDate), "d MMM yyyy", { locale: fr })}`
                  : ""}
              </p>
            </>
          ) : null}
        </div>

        {!loading ? (
          <BalanceChart
            entries={entries}
            currentBalance={box.balance}
            color={box.color}
          />
        ) : null}

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/[0.04] p-1">
          {(["balance", "history", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg py-2 text-xs font-semibold transition-colors",
                tab === t ? "bg-white text-[var(--ink-950)] shadow-sm" : "text-[var(--ink-500)]",
              )}
            >
              {t === "balance" ? "Action" : t === "history" ? "Historique" : "Réglages"}
            </button>
          ))}
        </div>

        {tab === "balance" ? (
          <div className="space-y-4">
            <EntryForm householdId={householdId} boxId={box.id} onSuccess={reloadEntries} />
            <details className="border-t border-black/[0.06] pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--ink-700)]">
                Ajuster le solde manuellement
              </summary>
              <div className="mt-3">
                <AdjustForm
                  householdId={householdId}
                  boxId={box.id}
                  currentBalance={box.balance}
                  onSuccess={reloadEntries}
                />
              </div>
            </details>
          </div>
        ) : null}

        {tab === "history" ? (
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-[var(--ink-500)] text-center py-8">Chargement…</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-[var(--ink-500)] text-center py-8">Aucun mouvement.</p>
            ) : (
              entries.map((e) => (
                <EntryRow
                  key={e.id}
                  entry={e}
                  householdId={householdId}
                  onChanged={reloadEntries}
                />
              ))
            )}
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="space-y-4">
            <section className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Settings className="size-4" /> Auto-versement
              </h4>
              <AutoFillForm
                householdId={householdId}
                boxId={box.id}
                current={box.autoFillRule}
              />
            </section>

            <section className="space-y-2 border-t border-black/[0.06] pt-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Pencil className="size-4" /> Actions
              </h4>
              <a
                href={`/api/households/${householdId}/savings/boxes/${box.id}/export`}
                className="btn-secondary inline-flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold"
                download
              >
                <Download className="size-4" />
                Exporter en CSV
              </a>
              <button
                type="button"
                onClick={() => {
                  const fd = new FormData();
                  fd.set("_action", box.isArchived ? "unarchive" : "archive");
                  archive.submit(fd);
                }}
                disabled={archive.isSubmitting}
                className="btn-secondary inline-flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                <Archive className="size-4" />
                {box.isArchived ? "Désarchiver" : "Archiver"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm("Supprimer cette enveloppe ? (uniquement possible si elle est vide)")) return;
                  const fd = new FormData();
                  fd.set("_action", "delete");
                  remove.submit(fd);
                }}
                disabled={remove.isSubmitting}
                className="btn-quiet inline-flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
                Supprimer
              </button>
            </section>
          </div>
        ) : null}
    </div>
  );
}

export function BoxDetailSheet({ isOpen, onClose, box, householdId }: BoxDetailSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={box?.name ?? ""} maxHeight={95}>
      {box ? (
        <BoxDetailContent key={box.id} box={box} householdId={householdId} onClose={onClose} />
      ) : null}
    </BottomSheet>
  );
}
