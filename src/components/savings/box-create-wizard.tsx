"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { todayDateInput } from "@/lib/date-input";
import { useFormAction } from "@/lib/use-form-action";
import { taskPalette } from "@/lib/constants";
import { savingsBoxTemplates } from "@/lib/savings/templates";
import { cn } from "@/lib/utils";

type BoxCreateWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
};

const KIND_OPTIONS = [
  { value: "savings" as const, label: "Épargne", hint: "Réserve qui grandit." },
  { value: "project" as const, label: "Projet", hint: "Vacances, voiture, projet ponctuel." },
  { value: "provision" as const, label: "Provision", hint: "Poste budgétaire récurrent." },
  { value: "debt" as const, label: "Dette / découvert", hint: "Solde négatif autorisé." },
];

export function BoxCreateWizard({ isOpen, onClose, householdId }: BoxCreateWizardProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"savings" | "project" | "provision" | "debt">("savings");
  const [color, setColor] = useState(taskPalette[0]);
  const [initialBalance, setInitialBalance] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [autoFillEnabled, setAutoFillEnabled] = useState(false);
  const [autoFillAmount, setAutoFillAmount] = useState("");
  const [autoFillType, setAutoFillType] =
    useState<"monthly_simple" | "weekly" | "every_x_weeks" | "every_x_days" | "daily">("monthly_simple");
  const [autoFillInterval, setAutoFillInterval] = useState("1");
  const [autoFillDayOfMonth, setAutoFillDayOfMonth] = useState("5");
  const [autoFillWeekdays, setAutoFillWeekdays] = useState<number[]>([1]);
  const [autoFillStartsOn, setAutoFillStartsOn] = useState(() => todayDateInput());
  const [autoFillEndsOn, setAutoFillEndsOn] = useState("");
  const [notes, setNotes] = useState("");

  const { submit, isSubmitting } = useFormAction({
    action: `/api/households/${householdId}/savings/boxes`,
    successMessage: "Enveloppe créée.",
    errorMessage: "Création impossible.",
    onSuccess: () => {
      reset();
      onClose();
    },
  });

  function reset() {
    setStep(0);
    setName("");
    setKind("savings");
    setColor(taskPalette[0]);
    setInitialBalance("");
    setTargetAmount("");
    setTargetDate("");
    setAutoFillEnabled(false);
    setAutoFillAmount("");
    setAutoFillType("monthly_simple");
    setAutoFillInterval("1");
    setAutoFillDayOfMonth("5");
    setAutoFillWeekdays([1]);
    setAutoFillStartsOn(todayDateInput());
    setAutoFillEndsOn("");
    setNotes("");
  }

  function applyTemplate(t: (typeof savingsBoxTemplates)[number]) {
    setName(t.name);
    setKind(t.kind);
    setColor(t.color);
    setNotes(t.notes);
    if (t.suggestedMonthlyAmount) {
      setAutoFillEnabled(true);
      setAutoFillAmount(String(t.suggestedMonthlyAmount));
    }
    setStep(1);
  }

  async function onCreate() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("kind", kind);
    fd.set("color", color);
    if (initialBalance.trim()) fd.set("initialBalance", initialBalance);
    if (targetAmount.trim()) fd.set("targetAmount", targetAmount);
    if (targetDate) fd.set("targetDate", targetDate);
    if (notes.trim()) fd.set("notes", notes);
    if (kind === "debt") fd.set("allowNegative", "on");
    if (autoFillEnabled) {
      fd.set("autoFillEnabled", "on");
      fd.set("autoFillAmount", autoFillAmount);
      fd.set("autoFillType", autoFillType);
      fd.set("autoFillInterval", autoFillInterval);
      if (autoFillType === "monthly_simple") fd.set("autoFillDayOfMonth", autoFillDayOfMonth);
      if (autoFillType === "weekly") {
        for (const weekday of autoFillWeekdays) fd.append("autoFillWeekdays", String(weekday));
      }
      fd.set("autoFillStartsOn", autoFillStartsOn);
      if (autoFillEndsOn) fd.set("autoFillEndsOn", autoFillEndsOn);
    }
    await submit(fd);
  }

  function toggleAutoFillWeekday(day: number) {
    setAutoFillWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  const canNext =
    (step === 0 && name.trim().length >= 1) ||
    (step === 1 && color) ||
    step === 2 ||
    (step === 3 && (!autoFillEnabled || autoFillAmount.trim().length > 0)) ||
    step === 4;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Nouvelle enveloppe"
      maxHeight={92}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                step >= i ? "bg-coral-500" : "bg-black/[0.08]",
              )}
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              Choisissez un modèle ou commencez à zéro.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {savingsBoxTemplates.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="app-surface flex items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-black/[0.02]"
                  style={{ borderLeft: `3px solid ${t.color}` }}
                >
                  <Sparkles className="size-4 mt-0.5 shrink-0" style={{ color: t.color }} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-ink-500 line-clamp-2">{t.notes}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-black/[0.06] pt-4">
              <label className="field-label">
                <span>Ou créez la vôtre</span>
                <input
                  className="field"
                  type="text"
                  placeholder="Nom de l'enveloppe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {KIND_OPTIONS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={cn(
                      "rounded-xl p-3 text-left text-sm transition-colors",
                      kind === k.value
                        ? "bg-coral-500 text-white"
                        : "bg-black/[0.04] text-ink-700",
                    )}
                  >
                    <p className="font-semibold">{k.label}</p>
                    <p className={cn("text-xs mt-0.5", kind === k.value ? "text-white/85" : "text-ink-500")}>
                      {k.hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Choisissez une couleur</p>
            <div className="grid grid-cols-8 gap-2">
              {taskPalette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Couleur ${c}`}
                  className={cn(
                    "size-9 rounded-full transition-transform",
                    color === c ? "ring-2 ring-offset-2 ring-[var(--ink-950)] scale-110" : "",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <label className="field-label">
              <span>Solde actuel (€)</span>
              <input
                className="field"
                type="text"
                inputMode="decimal"
                placeholder={kind === "debt" ? "Ex : -250" : "Ex : 500"}
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Objectif (facultatif)</p>
            <label className="field-label">
              <span>Montant cible (€)</span>
              <input
                className="field"
                type="text"
                inputMode="decimal"
                placeholder="Ex : 3000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </label>
            <label className="field-label">
              <span>Date cible (facultatif)</span>
              <input
                className="field"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-xl bg-black/[0.04] p-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={autoFillEnabled}
                onChange={(e) => setAutoFillEnabled(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold text-ink-950">
                  Ajouter automatiquement de l&apos;argent
                </span>
                <span className="block text-xs text-ink-500">
                  Mensuel, hebdo ou intervalle personnalisé.
                </span>
              </span>
            </label>

            {autoFillEnabled ? (
              <div className="space-y-3">
                <label className="field-label">
                  <span>Montant (€)</span>
                  <input
                    className="field"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex : 100"
                    value={autoFillAmount}
                    onChange={(e) => setAutoFillAmount(e.target.value)}
                    required
                  />
                </label>

                <label className="field-label">
                  <span>Fréquence</span>
                  <select
                    className="field"
                    value={autoFillType}
                    onChange={(e) => setAutoFillType(e.target.value as typeof autoFillType)}
                  >
                    <option value="monthly_simple">Mensuel</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="every_x_weeks">Toutes les X semaines</option>
                    <option value="every_x_days">Tous les X jours</option>
                    <option value="daily">Quotidien</option>
                  </select>
                </label>

                {(autoFillType === "every_x_days" || autoFillType === "every_x_weeks") ? (
                  <label className="field-label">
                    <span>Intervalle ({autoFillType === "every_x_days" ? "jours" : "semaines"})</span>
                    <input
                      className="field"
                      type="number"
                      min={1}
                      max={90}
                      value={autoFillInterval}
                      onChange={(e) => setAutoFillInterval(e.target.value)}
                    />
                  </label>
                ) : null}

                {autoFillType === "monthly_simple" ? (
                  <label className="field-label">
                    <span>Jour du mois (1-28)</span>
                    <input
                      className="field"
                      type="number"
                      min={1}
                      max={28}
                      value={autoFillDayOfMonth}
                      onChange={(e) => setAutoFillDayOfMonth(e.target.value)}
                    />
                  </label>
                ) : null}

                {autoFillType === "weekly" ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-ink-700">Jours de la semaine</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {[
                        { value: 1, label: "L" },
                        { value: 2, label: "M" },
                        { value: 3, label: "M" },
                        { value: 4, label: "J" },
                        { value: 5, label: "V" },
                        { value: 6, label: "S" },
                        { value: 0, label: "D" },
                      ].map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleAutoFillWeekday(d.value)}
                          className={cn(
                            "h-10 rounded-lg text-sm font-semibold transition-colors",
                            autoFillWeekdays.includes(d.value)
                              ? "bg-coral-500 text-white"
                              : "bg-black/[0.04] text-ink-700",
                          )}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <label className="field-label">
                    <span>Démarrage</span>
                    <input
                      className="field"
                      type="date"
                      value={autoFillStartsOn}
                      onChange={(e) => setAutoFillStartsOn(e.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    <span>Fin</span>
                    <input
                      className="field"
                      type="date"
                      value={autoFillEndsOn}
                      onChange={(e) => setAutoFillEndsOn(e.target.value)}
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-black/[0.04] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: color }} />
                <p className="font-semibold">{name}</p>
              </div>
              <p className="text-xs text-ink-500">
                {KIND_OPTIONS.find((k) => k.value === kind)?.label}
                {initialBalance ? ` · solde ${initialBalance} €` : ""}
                {targetAmount ? ` · objectif ${targetAmount} €` : ""}
                {autoFillEnabled ? ` · auto ${autoFillAmount} €` : ""}
              </p>
              {notes ? <p className="text-sm text-ink-700">{notes}</p> : null}
            </div>
            <label className="field-label">
              <span>Note (facultatif)</span>
              <textarea
                className="field min-h-[80px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={280}
              />
            </label>
          </div>
        ) : null}

        <div className="flex gap-2 pt-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="btn-secondary inline-flex items-center gap-1 px-3 py-2.5 text-sm font-semibold"
            >
              <ChevronLeft className="size-4" />
              Retour
            </button>
          ) : null}
          {step < 4 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary ml-auto inline-flex items-center gap-1 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Suivant
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || !name.trim()}
              onClick={onCreate}
              className="btn-primary ml-auto px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {isSubmitting ? "Création…" : "Créer l'enveloppe"}
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
