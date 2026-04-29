"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Archive, 
  Download, 
  Pencil, 
  Settings, 
  Trash2, 
  Sparkles, 
  ArrowDown, 
  ArrowUp, 
  ArrowLeftRight 
} from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { AdjustForm } from "@/components/savings/adjust-form";
import { BalanceChart } from "@/components/savings/balance-chart";
import { BoxDeleteDialog } from "@/components/savings/box-delete-dialog";
import { CalculatorManager } from "@/components/savings/calculator-manager";
import { CalculatorRunner } from "@/components/savings/calculator-runner";
import { EntryForm } from "@/components/savings/entry-form";
import { EntryRow } from "@/components/savings/entry-row";
import { AutoFillForm } from "@/components/savings/auto-fill-form";
import { TransferForm } from "@/components/savings/transfer-form";
import { formatCurrency } from "@/lib/savings/currency";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";
import type { SavingsBoxView, SavingsEntryView } from "@/components/savings/types";

type Tab = "summary" | "history" | "settings";
type ActionType = "deposit" | "withdrawal" | "transfer";

type BoxDetailSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  box: SavingsBoxView | null;
  householdId: string;
  activeBoxes: SavingsBoxView[];
};

function BoxDetailContent({
  box,
  householdId,
  onClose,
  activeBoxes,
}: {
  box: SavingsBoxView;
  householdId: string;
  onClose: () => void;
  activeBoxes: SavingsBoxView[];
}) {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (t === "history" || t === "settings") return t;
    }
    return "summary";
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }, [tab]);

  const [settingsTab, setSettingsTab] = useState<"general" | "autofill" | "calculators">("general");
  const [actionType, setActionType] = useState<ActionType | null>(null);
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

  const update = useFormAction({
    action: box ? `/api/households/${householdId}/savings/boxes/${box.id}` : "",
    successMessage: "Enveloppe mise à jour.",
    errorMessage: "Mise à jour impossible.",
  });

  const remove = useFormAction({
    action: box ? `/api/households/${householdId}/savings/boxes/${box.id}` : "",
    successMessage: "Enveloppe supprimée.",
    errorMessage: "Suppression impossible.",
    onSuccess: () => onClose(),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

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
      <BoxDeleteDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        boxName={box.name}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("_action", "delete");
          remove.submit(fd);
          setConfirmDelete(false);
        }}
      />

      <div className="sticky top-0 z-10 bg-[var(--card)] pb-2 pt-1">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/[0.04] p-1">
          {(["summary", "history", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg py-2 text-xs font-bold transition-all truncate px-1",
                tab === t 
                  ? "bg-white text-[var(--ink-950)] shadow-sm scale-[1.02]" 
                  : "text-[var(--ink-500)] hover:text-[var(--ink-700)]",
              )}
            >
              {t === "summary" ? "Synthèse" : t === "history" ? "Historique" : "Réglages"}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[350px]">
        {tab === "summary" ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: `${box.color}1A` }}
            >
              <p className="text-xs uppercase tracking-widest text-[var(--ink-500)] font-bold">Solde actuel</p>
              <p
                className={cn(
                  "mt-2 text-5xl font-bold tabular-nums tracking-tight",
                  box.balance < 0 ? "text-red-700" : "text-[var(--ink-950)]",
                )}
              >
                {formatCurrency(box.balance)}
              </p>
              {target ? (
                <div className="mt-6 space-y-3">
                  <div className="mx-auto h-2.5 max-w-xs overflow-hidden rounded-full bg-black/[0.08]">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${progress ?? 0}%`, background: box.color }}
                    />
                  </div>
                  <p className="text-xs font-medium text-[var(--ink-600)]">
                    Objectif {formatCurrency(target)}
                    {box.targetDate
                      ? ` · ${format(new Date(box.targetDate), "d MMM yyyy", { locale: fr })}`
                      : ""}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActionType(actionType === "deposit" ? null : "deposit")}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95",
                  actionType === "deposit"
                    ? "bg-[var(--leaf-500)] border-[var(--leaf-600)] text-white shadow-lg"
                    : "bg-[var(--leaf-50)] border-[var(--leaf-100)] text-[var(--leaf-700)] hover:bg-[var(--leaf-100)]"
                )}
              >
                <ArrowDown className="size-5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Déposer</span>
              </button>
              <button
                onClick={() => setActionType(actionType === "withdrawal" ? null : "withdrawal")}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95",
                  actionType === "withdrawal"
                    ? "bg-[var(--coral-500)] border-[var(--coral-600)] text-white shadow-lg"
                    : "bg-red-50 border-red-100 text-red-700 hover:bg-red-100"
                )}
              >
                <ArrowUp className="size-5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Retirer</span>
              </button>
              <button
                onClick={() => setActionType(actionType === "transfer" ? null : "transfer")}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95",
                  actionType === "transfer"
                    ? "bg-blue-600 border-blue-700 text-white shadow-lg"
                    : "bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100"
                )}
              >
                <ArrowLeftRight className="size-5" />
                <span className="text-[10px] font-bold uppercase tracking-wide">Transférer</span>
              </button>
            </div>

            {/* Dynamic Form Display */}
            {actionType ? (
              <div className="app-surface rounded-2xl p-5 border border-black/[0.03] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    {actionType === "deposit" ? "Nouveau versement" : actionType === "withdrawal" ? "Nouveau retrait" : "Nouveau transfert"}
                  </h4>
                  <button 
                    onClick={() => setActionType(null)}
                    className="text-xs font-bold text-[var(--ink-400)] hover:text-[var(--ink-600)]"
                  >
                    Annuler
                  </button>
                </div>
                {actionType === "transfer" ? (
                  <TransferForm
                    householdId={householdId}
                    fromBoxId={box.id}
                    boxes={activeBoxes}
                    onSuccess={() => {
                      reloadEntries();
                      setActionType(null);
                    }}
                  />
                ) : (
                  <EntryForm 
                    householdId={householdId} 
                    boxId={box.id} 
                    defaultType={actionType}
                    onSuccess={() => {
                      reloadEntries();
                      setActionType(null);
                    }} 
                  />
                )}
              </div>
            ) : null}

            {/* Chart - only if no form is open to save space */}
            {!actionType && !loading && entries.length > 0 ? (
              <div className="app-surface rounded-2xl p-4 overflow-hidden border border-black/[0.03]">
                <p className="text-[10px] uppercase font-bold text-[var(--ink-400)] mb-3 tracking-widest text-center">Évolution du solde</p>
                <BalanceChart
                  entries={entries}
                  currentBalance={box.balance}
                  color={box.color}
                />
              </div>
            ) : null}

            {!actionType ? (
              <CalculatorRunner
                householdId={householdId}
                boxId={box.id}
                boxes={activeBoxes}
                color={box.color}
                onRun={reloadEntries}
              />
            ) : null}

            {!actionType && (
              <details className="app-surface rounded-2xl border border-black/[0.03] overflow-hidden group">
                <summary className="cursor-pointer p-4 text-sm font-bold text-[var(--ink-700)] hover:bg-black/[0.02] transition-colors list-none flex items-center justify-between">
                  <span>Ajustement manuel du solde</span>
                  <Settings className="size-4 opacity-50 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="p-4 pt-0 border-t border-black/[0.03]">
                  <p className="text-xs text-[var(--ink-500)] mb-4 mt-2">
                    Pour corriger le solde sans créer de mouvement.
                  </p>
                  <AdjustForm
                    householdId={householdId}
                    boxId={box.id}
                    currentBalance={box.balance}
                    onSuccess={reloadEntries}
                  />
                </div>
              </details>
            )}
          </div>
        ) : null}

        {tab === "history" ? (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block size-6 animate-spin rounded-full border-2 border-black/10 border-t-black/40" />
                <p className="mt-2 text-xs text-[var(--ink-500)]">Chargement…</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center bg-black/[0.02] rounded-2xl border border-dashed border-black/10">
                <p className="text-sm text-[var(--ink-500)]">Aucun mouvement pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {entries.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    householdId={householdId}
                    onChanged={reloadEntries}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
            <div className="flex gap-2 p-1 bg-black/[0.03] rounded-lg">
              <button
                type="button"
                onClick={() => setSettingsTab("general")}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                  settingsTab === "general" ? "bg-white shadow-sm" : "text-[var(--ink-500)]"
                )}
              >
                Général
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("autofill")}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                  settingsTab === "autofill" ? "bg-white shadow-sm" : "text-[var(--ink-500)]"
                )}
              >
                Auto-versement
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("calculators")}
                className={cn(
                  "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                  settingsTab === "calculators" ? "bg-white shadow-sm" : "text-[var(--ink-500)]"
                )}
              >
                Calculateurs
              </button>
            </div>

            {settingsTab === "general" ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                <section className="app-surface rounded-2xl p-5 border border-black/[0.03]">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-[var(--ink-800)]">
                    <Pencil className="size-4 opacity-50" /> Identité
                  </h4>
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      fd.set("_action", "update");
                      update.submit(fd);
                    }}
                  >
                    <label className="field-label">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--ink-500)]">Nom de l&apos;enveloppe</span>
                      <input
                        name="name"
                        className="field mt-1"
                        type="text"
                        defaultValue={box.name}
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={update.isSubmitting}
                      className="btn-primary w-full py-3 text-sm font-bold shadow-md disabled:opacity-50"
                    >
                      {update.isSubmitting ? "Enregistrement…" : "Enregistrer les modifications"}
                    </button>
                  </form>
                </section>

                <section className="space-y-2">
                  <h4 className="px-1 text-[10px] uppercase tracking-wider font-bold text-[var(--ink-500)]">Gestion</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <a
                      href={`/api/households/${householdId}/savings/boxes/${box.id}/export`}
                      className="btn-secondary inline-flex items-center justify-center gap-2 py-3 text-sm font-bold"
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
                      className="btn-secondary inline-flex items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50"
                    >
                      <Archive className="size-4" />
                      {box.isArchived ? "Désarchiver" : "Archiver l'enveloppe"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      disabled={remove.isSubmitting}
                      className="btn-quiet inline-flex items-center justify-center gap-2 py-3 text-sm font-bold text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                      Supprimer définitivement
                    </button>
                  </div>
                </section>
              </div>
            ) : settingsTab === "autofill" ? (
              <div className="animate-in fade-in duration-200">
                <section className="app-surface rounded-2xl p-5 border border-black/[0.03]">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-[var(--coral-500)]">
                    <Sparkles className="size-4" /> Auto-versement
                  </h4>
                  <AutoFillForm
                    householdId={householdId}
                    boxId={box.id}
                    current={box.autoFillRule}
                  />
                </section>
              </div>
            ) : (
              <div className="app-surface rounded-2xl border border-black/[0.03] p-5 animate-in fade-in duration-200">
                <CalculatorManager
                  householdId={householdId}
                  currentBoxId={box.id}
                  boxes={activeBoxes}
                />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BoxDetailSheet({ isOpen, onClose, box, householdId, activeBoxes }: BoxDetailSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={box?.name ?? ""} maxHeight={95}>
      {box ? (
        <BoxDetailContent 
          key={box.id} 
          box={box} 
          householdId={householdId} 
          onClose={onClose} 
          activeBoxes={activeBoxes}
        />
      ) : null}
    </BottomSheet>
  );
}
