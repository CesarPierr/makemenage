"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeftRight, History, Plus, Sparkles } from "lucide-react";

import { BoxCard } from "@/components/savings/box-card";
import { BoxCreateWizard } from "@/components/savings/box-create-wizard";
import { BoxDetailSheet } from "@/components/savings/box-detail-sheet";
import { TransferHistory } from "@/components/savings/transfer-history";
import { TransferSheet } from "@/components/savings/transfer-sheet";
import { formatCurrency } from "@/lib/savings/currency";
import { cn } from "@/lib/utils";
import type { SavingsBoxView } from "@/components/savings/types";

type EpargneClientProps = {
  householdId: string;
  initialBoxes: SavingsBoxView[];
  initialTotalSavings: number;
  initialTotalDebt: number;
};

export function EpargneClient({
  householdId,
  initialBoxes,
  initialTotalSavings,
  initialTotalDebt,
}: EpargneClientProps) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"boxes" | "transfers">("boxes");
  const [manualOpenBoxId, setManualOpenBoxId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const boxes = initialBoxes;

  const totalSavings = initialTotalSavings;
  const totalDebt = initialTotalDebt;
  const activeBoxes = useMemo(() => boxes.filter((b) => !b.isArchived), [boxes]);
  const archivedBoxes = useMemo(() => boxes.filter((b) => b.isArchived), [boxes]);
  const urlBoxId = searchParams.get("box");
  const openBoxId =
    manualOpenBoxId ??
    (urlBoxId && boxes.some((b) => b.id === urlBoxId) ? urlBoxId : null);
  const openBox = useMemo(() => boxes.find((b) => b.id === openBoxId) ?? null, [boxes, openBoxId]);

  const balanceBoxes = useMemo(() => activeBoxes.filter((b) => b.kind !== "debt"), [activeBoxes]);
  const debtBoxes = useMemo(() => activeBoxes.filter((b) => b.kind === "debt"), [activeBoxes]);
  const isEmpty = activeBoxes.length === 0;

  return (
    <div className="space-y-4">
      <section
        aria-live="polite"
        className="app-surface glow-card rounded-[1.6rem] p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="section-kicker text-[var(--leaf-600)]">Épargne & Provisions</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-[var(--ink-950)] sm:text-5xl">
              {formatCurrency(totalSavings)}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-700)]">
              Réparti sur {balanceBoxes.length} enveloppe{balanceBoxes.length > 1 ? "s" : ""}.
            </p>
          </div>

          {debtBoxes.length > 0 ? (
            <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-black/[0.08] pt-4 sm:pt-0 sm:pl-6">
              <p className="section-kicker text-red-600">Dettes & Découverts</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-700 sm:text-3xl">
                {formatCurrency(totalDebt)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--ink-500)]">
                Sur {debtBoxes.length} poste{debtBoxes.length > 1 ? "s" : ""}.
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            type="button"
            className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
          >
            <Plus className="size-4" />
            Nouvelle enveloppe
          </button>
          {activeBoxes.length >= 2 ? (
            <button
              onClick={() => setTransferOpen(true)}
              type="button"
              className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
            >
              <ArrowLeftRight className="size-4" />
              Transférer
            </button>
          ) : null}
        </div>
      </section>

      <nav className="flex items-center gap-1 p-1 bg-black/[0.04] rounded-[1.2rem]">
        <button
          onClick={() => setTab("boxes")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition-all",
            tab === "boxes"
              ? "bg-white text-[var(--ink-950)] shadow-sm"
              : "text-[var(--ink-500)] hover:text-[var(--ink-700)]",
          )}
        >
          <Sparkles className={cn("size-4", tab === "boxes" ? "text-[var(--coral-500)]" : "")} />
          Enveloppes
        </button>
        <button
          onClick={() => setTab("transfers")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition-all",
            tab === "transfers"
              ? "bg-white text-[var(--ink-950)] shadow-sm"
              : "text-[var(--ink-500)] hover:text-[var(--ink-700)]",
          )}
        >
          <History className={cn("size-4", tab === "transfers" ? "text-[var(--coral-500)]" : "")} />
          Transferts
        </button>
      </nav>

      {tab === "boxes" ? (
        <>
          {isEmpty ? (
            <section className="app-surface rounded-2xl p-6 text-center">
              <Sparkles className="size-8 mx-auto text-[var(--coral-500)]" />
              <h3 className="mt-3 text-lg font-bold">Commencez par une enveloppe</h3>
              <p className="mt-1 text-sm text-[var(--ink-700)] max-w-md mx-auto">
                Choisissez un modèle (épargne précaution, vacances, voiture…) ou créez la vôtre.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                type="button"
                className="btn-primary mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
              >
                <Plus className="size-4" />
                Créer ma première enveloppe
              </button>
            </section>
          ) : (
            <section className="grid gap-3 sm:grid-cols-2">
              {activeBoxes.map((b) => (
                <BoxCard key={b.id} box={b} onClick={() => setManualOpenBoxId(b.id)} />
              ))}
            </section>
          )}

          {archivedBoxes.length > 0 ? (
            <details className="app-surface rounded-2xl p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--ink-700)]">
                {archivedBoxes.length} enveloppe{archivedBoxes.length > 1 ? "s" : ""} archivée{archivedBoxes.length > 1 ? "s" : ""}
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {archivedBoxes.map((b) => (
                  <BoxCard key={b.id} box={b} onClick={() => setManualOpenBoxId(b.id)} />
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <TransferHistory
          householdId={householdId}
          refreshKey={refreshKey}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}

      <BoxCreateWizard
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        householdId={householdId}
      />
      <BoxDetailSheet
        isOpen={openBoxId !== null}
        onClose={() => {
          setManualOpenBoxId(null);
          const url = new URL(window.location.href);
          url.searchParams.delete("box");
          url.searchParams.delete("tab");
          window.history.replaceState({}, "", url.toString());
        }}
        box={openBox}
        householdId={householdId}
        activeBoxes={activeBoxes}
      />
      <TransferSheet
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        householdId={householdId}
        boxes={activeBoxes}
      />
    </div>
  );
}
