"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, ChevronDown, Plus, Settings2 } from "lucide-react";

import { formatCurrency } from "@/lib/savings/currency";
import { evaluateFormula } from "@/lib/savings/formula";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";
import type { SavingsBoxView, SavingsCalculatorView } from "@/components/savings/types";

type CalculatorRunnerProps = {
  householdId: string;
  boxId?: string | null;
  boxes: SavingsBoxView[];
  color: string;
  title?: string;
  defaultOpen?: boolean;
  variant?: "accordion" | "grid";
  onRun?: () => void;
  onEdit?: (calculator: SavingsCalculatorView) => void;
  onCreate?: () => void;
};

function parseInput(value: string) {
  const parsed = Number.parseFloat(value.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function applyPreviewResult(calculator: SavingsCalculatorView, raw: number) {
  let value = raw;
  let entryType = calculator.resultMode;
  if (value < 0) {
    if (calculator.negativeMode === "clamp_to_zero") {
      value = 0;
    } else {
      value = Math.abs(value);
      entryType = calculator.resultMode === "deposit" ? "withdrawal" : "deposit";
    }
  }
  switch (calculator.roundingMode) {
    case "euro_floor":
      value = Math.floor(value);
      break;
    case "euro_ceil":
      value = Math.ceil(value);
      break;
    case "euro_nearest":
      value = Math.round(value);
      break;
    case "cents":
      value = Math.round(value * 100) / 100;
      break;
  }
  return { amount: value, entryType };
}

export function CalculatorRunner({
  householdId,
  boxId = null,
  boxes,
  color,
  title = "Calculateurs rapides",
  defaultOpen = false,
  variant = "accordion",
  onRun,
  onEdit,
  onCreate,
}: CalculatorRunnerProps) {
  const [calculators, setCalculators] = useState<SavingsCalculatorView[]>([]);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedId, setSelectedId] = useState<string>("");
  const [targetBoxId, setTargetBoxId] = useState(boxId ?? "");
  const [inputs, setInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const suffix = boxId ? `?boxId=${boxId}` : "";
    fetch(`/api/households/${householdId}/savings/calculators${suffix}`, {
      headers: { "x-requested-with": "fetch" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list = (data.calculators ?? []) as SavingsCalculatorView[];
        setCalculators(list);
        
        // If we are in accordion mode (contextual in box sheet), we might want to auto-select
        if (list[0] && variant === "accordion") {
          setSelectedId((current) => current || list[0].id);
          setTargetBoxId((current) => current || boxId || list[0].boxId || boxes.find((b) => !b.isArchived)?.id || "");
          setInputs((current) => {
            if (Object.keys(current).length > 0) return current;
            return Object.fromEntries(
              list[0].fields.map((field) => [field.key, field.defaultValue?.replace(".", ",") ?? ""]),
            );
          });
        }
      })
      .catch(() => {
        if (!cancelled) setCalculators([]);
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, boxId, boxes, variant]);

  const selected = useMemo(
    () => calculators.find((calculator) => calculator.id === selectedId) ?? null,
    [calculators, selectedId],
  );

  const preview = useMemo(() => {
    if (!selected) return null;
    const values: Record<string, number> = {};
    for (const field of selected.fields) {
      const value = parseInput(inputs[field.key] ?? "");
      if (value == null) return null;
      values[field.key] = value;
    }
    try {
      return applyPreviewResult(selected, evaluateFormula(selected.formula, values));
    } catch {
      return null;
    }
  }, [inputs, selected]);

  const run = useFormAction({
    action: selected
      ? `/api/households/${householdId}/savings/calculators/${selected.id}/run`
      : "",
    successMessage: selected?.resultMode === "none" ? "Calcul terminé." : "Calcul ajouté à l'enveloppe.",
    errorMessage: "Impossible d'appliquer ce calcul.",
    onSuccess: onRun,
  });

  if (calculators.length === 0) {
    if (variant === "grid") {
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={onCreate}
            className="app-surface rounded-2xl border border-dashed border-black/10 p-5 flex flex-col items-center justify-center gap-2 text-center hover:bg-black/[0.02] transition-colors group h-full min-h-[80px]"
          >
            <Plus className="size-5 text-ink-400 group-hover:text-coral-500 transition-colors" />
            <span className="text-xs font-bold text-ink-400">Nouveau calculateur</span>
          </button>
        </div>
      );
    }
    return null;
  }

  const form = selected ? (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const fd = new FormData();
        for (const field of selected.fields) {
          fd.set(`input:${field.key}`, inputs[field.key] ?? "");
        }
        if (selected.resultMode !== "none") {
          fd.set("targetBoxId", targetBoxId);
        }
        run.submit(fd);
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-[var(--ink-900)]">{selected.name}</p>
        <button 
          type="button" 
          onClick={() => setSelectedId("")}
          className="text-xs font-bold text-ink-400 hover:text-red-500"
        >
          Annuler
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="field-label sm:col-span-2">
          <span className="text-[10px] uppercase font-bold text-ink-500">Enveloppe cible</span>
          <select
            className="field"
            value={targetBoxId}
            onChange={(event) => setTargetBoxId(event.target.value)}
            required
          >
            {boxes.filter((b) => !b.isArchived).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        {selected.fields.map((field) => (
          <label key={field.id} className="field-label">
            <span className="text-[10px] uppercase font-bold text-ink-500">{field.label}</span>
            <input
              className="field"
              type="text"
              inputMode="decimal"
              value={inputs[field.key] ?? ""}
              onChange={(event) => setInputs((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.type === "percent" ? "20" : field.type === "amount" ? "0,00" : "0"}
              required={field.isRequired}
              autoFocus={selected.fields[0].id === field.id}
            />
            {field.helperText ? (
              <span className="text-[0.65rem] font-medium text-ink-400 mt-0.5">{field.helperText}</span>
            ) : null}
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={run.isSubmitting || !preview || (selected.resultMode !== "none" && (preview.amount <= 0 || !targetBoxId))}
        className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        <Calculator className="size-4" />
        {selected.resultMode === "none"
          ? "Terminer"
          : preview
          ? `${preview.entryType === "deposit" ? "Ajouter" : "Retirer"} ${formatCurrency(preview.amount)}`
          : "Calculer"}
      </button>
    </form>
  ) : null;

  if (variant === "grid") {
    return (
      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {calculators.map((calculator) => (
            <div key={calculator.id} className="relative group">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(calculator.id);
                  setTargetBoxId(calculator.boxId || boxes.find((b) => !b.isArchived)?.id || "");
                  setInputs(Object.fromEntries(
                    calculator.fields.map((field) => [field.key, field.defaultValue?.replace(".", ",") ?? ""]),
                  ));
                }}
                className={cn(
                  "w-full app-surface interactive-surface rounded-2xl border p-4 text-left transition-all hover:shadow-lg active:scale-[0.99]",
                  selectedId === calculator.id 
                    ? "border-coral-500 bg-[var(--coral-50)] ring-2 ring-[var(--coral-100)]" 
                    : "border-black/[0.04] hover:border-black/[0.1]",
                )}
                style={{ borderLeft: selectedId === calculator.id ? `4px solid var(--coral-500)` : `4px solid ${color}` }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 p-2 rounded-xl transition-colors",
                    selectedId === calculator.id ? "bg-white dark:bg-[#262830]" : "bg-black/[0.03] group-hover:bg-black/[0.06]"
                  )}>
                    <Calculator className="size-4" style={{ color: selectedId === calculator.id ? "var(--coral-500)" : color }} />
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <h3 className="truncate text-sm font-bold text-ink-950">{calculator.name}</h3>
                    <p className="mt-0.5 line-clamp-1 text-[10px] uppercase font-bold tracking-wider text-ink-400">
                      {calculator.boxId ? "Cible par défaut" : "Global"}
                    </p>
                  </div>
                </div>
              </button>
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(calculator); }}
                  className="absolute top-2 right-2 p-2 rounded-lg text-ink-400 hover:text-[var(--ink-900)] hover:bg-black/[0.05] transition-all opacity-0 group-hover:opacity-100"
                  title="Modifier le modèle"
                >
                  <Settings2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="app-surface rounded-2xl border border-dashed border-black/10 p-4 flex items-center justify-center gap-2 hover:bg-black/[0.02] transition-colors group min-h-[72px]"
            >
              <Plus className="size-4 text-ink-400 group-hover:text-coral-500 transition-colors" />
              <span className="text-xs font-bold text-ink-400">Nouveau</span>
            </button>
          )}
        </div>
        
        {selected ? (
          <div className="app-surface rounded-2xl border border-black/[0.03] p-5 animate-in fade-in zoom-in-95 duration-200">
            {form}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="app-surface overflow-hidden rounded-2xl border border-black/[0.03]">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[var(--ink-800)]">
          <Calculator className="size-4" style={{ color }} />
          {title}
        </span>
        <ChevronDown className={cn("size-4 text-ink-500 transition-transform", isOpen ? "rotate-180" : "")} />
      </button>

      {isOpen ? (
        <div className="space-y-3 border-t border-black/[0.04] p-4 pt-3">
          {calculators.length > 1 ? (
            <label className="field-label">
              <span>Calculateur</span>
              <select
                className="field"
                value={selected?.id ?? ""}
                onChange={(event) => {
                  const next = calculators.find((calculator) => calculator.id === event.target.value);
                  setSelectedId(event.target.value);
                  if (next) {
                    setTargetBoxId(boxId || next.boxId || boxes.find((b) => !b.isArchived)?.id || "");
                    setInputs(Object.fromEntries(
                      next.fields.map((field) => [field.key, field.defaultValue?.replace(".", ",") ?? ""]),
                    ));
                  }
                }}
              >
                {calculators.map((calculator) => (
                  <option key={calculator.id} value={calculator.id}>
                    {calculator.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {form}
        </div>
      ) : null}
    </section>
  );
}
