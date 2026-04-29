"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";

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
  onRun?: () => void;
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
  onRun,
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
        if (list[0]) {
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
  }, [householdId, boxId, boxes]);

  const selected = useMemo(
    () => calculators.find((calculator) => calculator.id === selectedId) ?? calculators[0] ?? null,
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
    successMessage: "Calcul ajouté à l'enveloppe.",
    errorMessage: "Impossible d'appliquer ce calcul.",
    onSuccess: onRun,
  });

  if (calculators.length === 0) return null;

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
        <ChevronDown className={cn("size-4 text-[var(--ink-500)] transition-transform", isOpen ? "rotate-180" : "")} />
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

          {selected ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const fd = new FormData();
                for (const field of selected.fields) {
                  fd.set(`input:${field.key}`, inputs[field.key] ?? "");
                }
                fd.set("targetBoxId", targetBoxId);
                run.submit(fd);
              }}
            >
              <p className="text-xs font-semibold text-[var(--ink-700)]">{selected.name}</p>
              <label className="field-label">
                <span>Enveloppe cible</span>
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
                  <span>{field.label}</span>
                  <input
                    className="field"
                    type="text"
                    inputMode="decimal"
                    value={inputs[field.key] ?? ""}
                    onChange={(event) => setInputs((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.type === "percent" ? "20" : field.type === "amount" ? "0,00" : "0"}
                    required={field.isRequired}
                  />
                  {field.helperText ? (
                    <span className="text-[0.7rem] text-[var(--ink-500)]">{field.helperText}</span>
                  ) : null}
                </label>
              ))}

              <button
                type="submit"
                disabled={run.isSubmitting || !preview || preview.amount <= 0 || !targetBoxId}
                className="btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold disabled:opacity-50"
              >
                <Calculator className="size-4" />
                {preview
                  ? `${preview.entryType === "deposit" ? "Ajouter" : "Retirer"} ${formatCurrency(preview.amount)}`
                  : "Calculer"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
