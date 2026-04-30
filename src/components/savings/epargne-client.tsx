"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Calculator, History, Plus, Sparkles } from "lucide-react";

import { BoxCard } from "@/components/savings/box-card";
import { BoxCreateWizard } from "@/components/savings/box-create-wizard";
import { BoxDetailSheet } from "@/components/savings/box-detail-sheet";
import { CalculatorManager } from "@/components/savings/calculator-manager";
import { CalculatorRunner } from "@/components/savings/calculator-runner";
import { TransferHistory } from "@/components/savings/transfer-history";
import { TransferSheet } from "@/components/savings/transfer-sheet";
import { BottomSheet } from "@/components/ui/bottom-sheet";
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
  const [manualTab, setManualTab] = useState<"boxes" | "calculators" | null>(null);
  const [manualOpenBoxId, setManualOpenBoxId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferHistoryOpen, setTransferHistoryOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [managerOpen, setManagerOpen] = useState(false);
  const [editingCalculatorId, setEditingCalculatorId] = useState<string | null>(null);
  const [refreshCalculatorsKey, setRefreshCalculatorsKey] = useState(0);

  const boxes = initialBoxes;
  const urlTab = searchParams.get("tab");
  const tab = manualTab ?? (urlTab === "calculators" ? "calculators" : "boxes");

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
            <p className="section-kicker text-leaf-600">Épargne & Provisions</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-ink-950 sm:text-5xl">
              {formatCurrency(totalSavings)}
            </p>
            <p className="mt-1 text-sm text-ink-700">
              Réparti sur {balanceBoxes.length} enveloppe{balanceBoxes.length > 1 ? "s" : ""}.
            </p>
          </div>

          {debtBoxes.length > 0 ? (
            <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-black/[0.08] pt-4 sm:pt-0 sm:pl-6">
              <p className="section-kicker text-red-600">Dettes & Découverts</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-red-700 sm:text-3xl">
                {formatCurrency(totalDebt)}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
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
            <>
              <button
                onClick={() => setTransferOpen(true)}
                type="button"
                className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
              >
                <ArrowLeftRight className="size-4" />
                Transférer
              </button>
              <button
                onClick={() => setTransferHistoryOpen(true)}
                type="button"
                className="btn-quiet inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[var(--ink-600)]"
              >
                <History className="size-4" />
                Historique
              </button>
            </>
          ) : null}
        </div>
      </section>

      <nav className="flex items-center gap-1 p-1 bg-black/[0.04] rounded-[1.2rem]">
        <button
          onClick={() => {
            setManualTab("boxes");
            const url = new URL(window.location.href);
            url.searchParams.set("tab", "boxes");
            window.history.replaceState({}, "", url.toString());
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition-all",
            tab === "boxes"
              ? "bg-white dark:bg-[#262830] text-ink-950 shadow-sm"
              : "text-ink-500 hover:text-ink-700",
          )}
        >
          <Sparkles className={cn("size-4", tab === "boxes" ? "text-coral-500" : "")} />
          Enveloppes
        </button>
        <button
          onClick={() => {
            setManualTab("calculators");
            const url = new URL(window.location.href);
            url.searchParams.set("tab", "calculators");
            window.history.replaceState({}, "", url.toString());
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-xl transition-all",
            tab === "calculators"
              ? "bg-white dark:bg-[#262830] text-ink-950 shadow-sm"
              : "text-ink-500 hover:text-ink-700",
          )}
        >
          <Calculator className={cn("size-4", tab === "calculators" ? "text-coral-500" : "")} />
          Calculateurs
        </button>
      </nav>

      {tab === "boxes" ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {isEmpty ? (
            <section className="app-surface rounded-2xl p-6 text-center">
              <Sparkles className="size-8 mx-auto text-coral-500" />
              <h3 className="mt-3 text-lg font-bold">Commencez par une enveloppe</h3>
              <p className="mt-1 text-sm text-ink-700 max-w-md mx-auto">
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
            <details className="mt-4 app-surface rounded-2xl p-4 group">
              <summary className="cursor-pointer text-sm font-semibold text-ink-500 flex items-center justify-between">
                <span>{archivedBoxes.length} enveloppe{archivedBoxes.length > 1 ? "s" : ""} archivée{archivedBoxes.length > 1 ? "s" : ""}</span>
                <Plus className="size-4 group-open:rotate-45 transition-transform" />
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {archivedBoxes.map((b) => (
                  <BoxCard key={b.id} box={b} onClick={() => setManualOpenBoxId(b.id)} />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="px-1 flex items-center justify-between">
            <div>
              <p className="section-kicker text-coral-500">Utiliser</p>
              <h2 className="text-lg font-bold text-ink-950">Lancer un calcul</h2>
            </div>
          </div>
          
          <CalculatorRunner
            key={refreshCalculatorsKey}
            householdId={householdId}
            boxes={activeBoxes}
            color="var(--coral-500)"
            variant="grid"
            onCreate={() => {
              setEditingCalculatorId(null);
              setManagerOpen(true);
            }}
            onEdit={(calc) => {
              setEditingCalculatorId(calc.id);
              setManagerOpen(true);
            }}
          />

          <CalculatorManager
            householdId={householdId}
            boxes={activeBoxes}
            isOpen={managerOpen}
            initialEditingId={editingCalculatorId}
            onClose={() => {
              setManagerOpen(false);
              setEditingCalculatorId(null);
            }}
            onSuccess={() => setRefreshCalculatorsKey(k => k + 1)}
          />
        </section>
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
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
      <TransferSheet
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        householdId={householdId}
        boxes={activeBoxes}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
      <BottomSheet
        isOpen={transferHistoryOpen}
        onClose={() => setTransferHistoryOpen(false)}
        title="Historique des transferts"
        maxHeight={88}
      >
        <TransferHistory
          householdId={householdId}
          refreshKey={refreshKey}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      </BottomSheet>
    </div>
  );
}
