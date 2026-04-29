"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Plus, Sparkles } from "lucide-react";

import { BoxCard } from "@/components/savings/box-card";
import { BoxCreateWizard } from "@/components/savings/box-create-wizard";
import { BoxDetailSheet } from "@/components/savings/box-detail-sheet";
import { TransferSheet } from "@/components/savings/transfer-sheet";
import { formatCurrency } from "@/lib/savings/currency";
import { cn } from "@/lib/utils";
import type { SavingsBoxView } from "@/components/savings/types";

type EpargneClientProps = {
  householdId: string;
  initialBoxes: SavingsBoxView[];
  initialTotalBalance: number;
};

export function EpargneClient({ householdId, initialBoxes, initialTotalBalance }: EpargneClientProps) {
  const [openBoxId, setOpenBoxId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const boxes = initialBoxes;
  const totalBalance = initialTotalBalance;
  const activeBoxes = useMemo(() => boxes.filter((b) => !b.isArchived), [boxes]);
  const archivedBoxes = useMemo(() => boxes.filter((b) => b.isArchived), [boxes]);
  const openBox = useMemo(() => boxes.find((b) => b.id === openBoxId) ?? null, [boxes, openBoxId]);

  const isEmpty = activeBoxes.length === 0;

  return (
    <div className="space-y-4">
      <section
        aria-live="polite"
        className="app-surface glow-card rounded-[1.6rem] p-5 sm:p-6"
      >
        <p className="section-kicker">Solde du foyer</p>
        <p
          className={cn(
            "mt-1 text-4xl font-bold tabular-nums sm:text-5xl",
            totalBalance < 0 ? "text-red-700" : "text-[var(--ink-950)]",
          )}
        >
          {formatCurrency(totalBalance)}
        </p>
        <p className="mt-1 text-sm text-[var(--ink-700)]">
          Réparti sur {activeBoxes.length} enveloppe{activeBoxes.length > 1 ? "s" : ""}.
        </p>
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
            <BoxCard key={b.id} box={b} onClick={() => setOpenBoxId(b.id)} />
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
              <BoxCard key={b.id} box={b} onClick={() => setOpenBoxId(b.id)} />
            ))}
          </div>
        </details>
      ) : null}

      <BoxCreateWizard
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        householdId={householdId}
      />
      <BoxDetailSheet
        isOpen={openBoxId !== null}
        onClose={() => setOpenBoxId(null)}
        box={openBox}
        householdId={householdId}
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
