"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Info, Plus, Save, Trash2, Wand2, X } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/savings/currency";
import { evaluateFormula } from "@/lib/savings/formula";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";
import type { SavingsBoxView, SavingsCalculatorFieldView, SavingsCalculatorView } from "@/components/savings/types";

type DraftField = {
  draftId: string;
  key: string;
  label: string;
  type: "number" | "amount" | "percent";
  defaultValue: string;
  helperText: string;
  isRequired: boolean;
};

type CalculatorManagerProps = {
  householdId: string;
  currentBoxId: string;
  boxes: SavingsBoxView[];
};

let draftFieldCounter = 0;

const nextDraftFieldId = () => {
  draftFieldCounter += 1;
  return `field-${draftFieldCounter}`;
};

const emptyField = (): DraftField => ({
  draftId: nextDraftFieldId(),
  key: "",
  label: "",
  type: "number",
  defaultValue: "",
  helperText: "",
  isRequired: true,
});

const e85Fields = (): DraftField[] => [
  {
    draftId: nextDraftFieldId(),
    key: "prix_e85",
    label: "Prix E85",
    type: "amount",
    defaultValue: "0,85",
    helperText: "Prix payé au litre",
    isRequired: true,
  },
  {
    draftId: nextDraftFieldId(),
    key: "litres",
    label: "Litres",
    type: "number",
    defaultValue: "40",
    helperText: "Quantité mise à la pompe",
    isRequired: true,
  },
  {
    draftId: nextDraftFieldId(),
    key: "prix_sp95",
    label: "Prix SP95 de référence",
    type: "amount",
    defaultValue: "1,85",
    helperText: "Prix que vous voulez comparer",
    isRequired: true,
  },
  {
    draftId: nextDraftFieldId(),
    key: "surconsommation",
    label: "Surconsommation E85",
    type: "percent",
    defaultValue: "20",
    helperText: "Ex : 20 pour 20%",
    isRequired: true,
  },
];

function fieldFromView(field: SavingsCalculatorFieldView): DraftField {
  return {
    draftId: field.id,
    key: field.key,
    label: field.label,
    type: field.type,
    defaultValue: field.defaultValue?.replace(".", ",") ?? "",
    helperText: field.helperText ?? "",
    isRequired: field.isRequired,
  };
}

function parseDefault(value: string) {
  if (!value.trim()) return 0;
  const parsed = Number.parseFloat(value.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fieldsToPayload(fields: DraftField[]) {
  return fields
    .filter((field) => field.key.trim() && field.label.trim())
    .map((field, index) => ({
      key: field.key.trim(),
      label: field.label.trim(),
      type: field.type,
      defaultValue: field.defaultValue.trim(),
      helperText: field.helperText.trim() || undefined,
      isRequired: field.isRequired,
      sortOrder: index,
    }));
}

export function CalculatorManager({ householdId, currentBoxId, boxes }: CalculatorManagerProps) {
  const [calculators, setCalculators] = useState<SavingsCalculatorView[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("Économie E85");
  const [boxId, setBoxId] = useState(currentBoxId);
  const [description, setDescription] = useState("");
  const [formula, setFormula] = useState("(litres * prix_sp95) - (litres * prix_e85 * (1 + surconsommation / 100))");
  const [reasonTemplate, setReasonTemplate] = useState("Économie E85 — {litres} L à {prix_e85} €/L");
  const [resultMode, setResultMode] = useState<"deposit" | "withdrawal">("deposit");
  const [negativeMode, setNegativeMode] = useState<"clamp_to_zero" | "convert_to_opposite">("clamp_to_zero");
  const [roundingMode, setRoundingMode] = useState<"cents" | "euro_floor" | "euro_ceil" | "euro_nearest">("cents");
  const [fields, setFields] = useState<DraftField[]>(() => e85Fields());

  function loadCalculators() {
    fetch(`/api/households/${householdId}/savings/calculators?boxId=${currentBoxId}&archived=1`, {
      headers: { "x-requested-with": "fetch" },
    })
      .then((res) => res.json())
      .then((data) => setCalculators(data.calculators ?? []))
      .catch(() => setCalculators([]));
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/households/${householdId}/savings/calculators?boxId=${currentBoxId}&archived=1`, {
      headers: { "x-requested-with": "fetch" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setCalculators(data.calculators ?? []);
      })
      .catch(() => {
        if (!cancelled) setCalculators([]);
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, currentBoxId]);

  const action = editingId
    ? `/api/households/${householdId}/savings/calculators/${editingId}`
    : `/api/households/${householdId}/savings/calculators`;

  const save = useFormAction({
    action,
    successMessage: editingId ? "Calculateur modifié." : "Calculateur créé.",
    errorMessage: "Impossible d'enregistrer ce calculateur.",
    onSuccess: loadCalculators,
  });

  const deleteAction = useFormAction({
    action,
    successMessage: "Calculateur supprimé.",
    errorMessage: "Suppression impossible.",
    onSuccess: () => {
      resetForm();
      loadCalculators();
    },
  });

  const preview = useMemo(() => {
    const values = Object.fromEntries(fieldsToPayload(fields).map((field) => [field.key, parseDefault(field.defaultValue)]));
    try {
      const raw = evaluateFormula(formula, values);
      return Math.round(raw * 100) / 100;
    } catch {
      return null;
    }
  }, [fields, formula]);

  function resetForm() {
    setEditingId(null);
    setName("Économie E85");
    setBoxId(currentBoxId);
    setDescription("");
    setFormula("(litres * prix_sp95) - (litres * prix_e85 * (1 + surconsommation / 100))");
    setReasonTemplate("Économie E85 — {litres} L à {prix_e85} €/L");
    setResultMode("deposit");
    setNegativeMode("clamp_to_zero");
    setRoundingMode("cents");
    setFields(e85Fields());
  }

  function loadForEdit(calculator: SavingsCalculatorView) {
    setEditingId(calculator.id);
    setName(calculator.name);
    setBoxId(calculator.boxId);
    setDescription(calculator.description ?? "");
    setFormula(calculator.formula);
    setReasonTemplate(calculator.reasonTemplate ?? "");
    setResultMode(calculator.resultMode);
    setNegativeMode(calculator.negativeMode);
    setRoundingMode(calculator.roundingMode);
    setFields(calculator.fields.map(fieldFromView));
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = fieldsToPayload(fields);
    const fd = new FormData();
    fd.set("boxId", boxId);
    fd.set("name", name);
    fd.set("description", description);
    fd.set("formula", formula);
    fd.set("reasonTemplate", reasonTemplate);
    fd.set("resultMode", resultMode);
    fd.set("negativeMode", negativeMode);
    fd.set("roundingMode", roundingMode);
    fd.set("fields", JSON.stringify(payload));
    save.submit(fd);
  }

  return (
    <div className="space-y-4">
      <Dialog isOpen={showInfo} onClose={() => setShowInfo(false)} title="Exemples de calculateurs">
        <div className="space-y-4 text-sm">
          <p>
            Un calculateur est un petit formulaire qui applique une formule puis crée un mouvement
            dans l&apos;enveloppe cible. Les variables disponibles sont les clés de vos champs.
          </p>
          <div className="rounded-xl bg-black/[0.04] p-3">
            <p className="font-bold">Économie E85</p>
            <code className="mt-1 block text-xs">
              (litres * prix_sp95) - (litres * prix_e85 * (1 + surconsommation / 100))
            </code>
          </div>
          <div className="rounded-xl bg-black/[0.04] p-3">
            <p className="font-bold">Mettre 15% d&apos;une prime de côté</p>
            <code className="mt-1 block text-xs">prime * 15 / 100</code>
          </div>
          <p className="text-xs text-[var(--ink-500)]">
            Opérateurs : +, -, *, /, parenthèses. Fonctions : min, max, round, ceil, floor, abs.
            Dans la formule, utilisez le point pour les décimales.
          </p>
        </div>
      </Dialog>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-[var(--ink-900)]">Calculateurs personnalisés</h4>
          <p className="text-xs text-[var(--ink-500)]">Créez vos propres règles sans coder.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs font-bold"
        >
          <Info className="size-4" />
          Aide
        </button>
      </div>

      {calculators.length > 0 ? (
        <div className="grid gap-2">
          {calculators.map((calculator) => (
            <button
              type="button"
              key={calculator.id}
              onClick={() => loadForEdit(calculator)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-colors",
                editingId === calculator.id
                  ? "border-[var(--coral-500)] bg-[rgba(216,100,61,0.08)]"
                  : "border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.04]",
              )}
            >
              <span className="block text-sm font-bold">{calculator.name}</span>
              <span className="block truncate text-xs text-[var(--ink-500)]">{calculator.formula}</span>
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={submitForm} className="space-y-4 rounded-2xl border border-black/[0.04] bg-black/[0.015] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Calculator className="size-4 text-[var(--coral-500)]" />
            {editingId ? "Modifier le calculateur" : "Nouveau calculateur"}
          </p>
          <button
            type="button"
            onClick={resetForm}
            className="btn-quiet inline-flex items-center gap-1 px-2 py-1 text-xs font-bold"
          >
            <X className="size-3.5" />
            Réinitialiser
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field-label">
            <span>Nom</span>
            <input className="field" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="field-label">
            <span>Enveloppe cible</span>
            <select className="field" value={boxId} onChange={(event) => setBoxId(event.target.value)}>
              {boxes.filter((box) => !box.isArchived).map((box) => (
                <option key={box.id} value={box.id}>
                  {box.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            setName("Économie E85");
            setDescription("Calcule l'économie réalisée par rapport à un plein SP95 de référence.");
            setFields(e85Fields());
            setFormula("(litres * prix_sp95) - (litres * prix_e85 * (1 + surconsommation / 100))");
            setReasonTemplate("Économie E85 — {litres} L à {prix_e85} €/L");
          }}
          className="btn-secondary inline-flex w-full items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold"
        >
          <Wand2 className="size-4" />
          Charger le modèle E85
        </button>

        <label className="field-label">
          <span>Description (facultatif)</span>
          <input className="field" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Champs</p>
            <button
              type="button"
              onClick={() => setFields((current) => [...current, emptyField()])}
              className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-xs font-bold"
            >
              <Plus className="size-3.5" />
              Champ
            </button>
          </div>
          {fields.map((field, index) => (
            <div key={field.draftId} className="grid gap-2 rounded-xl bg-white p-3 shadow-sm sm:grid-cols-[1fr_1fr_120px]">
              <input
                className="field text-sm"
                placeholder="clé_variable"
                value={field.key}
                onChange={(event) => setFields((current) => current.map((item, i) => i === index ? { ...item, key: event.target.value } : item))}
                required
              />
              <input
                className="field text-sm"
                placeholder="Libellé"
                value={field.label}
                onChange={(event) => setFields((current) => current.map((item, i) => i === index ? { ...item, label: event.target.value } : item))}
                required
              />
              <select
                className="field text-sm"
                value={field.type}
                onChange={(event) => setFields((current) => current.map((item, i) => i === index ? { ...item, type: event.target.value as DraftField["type"] } : item))}
              >
                <option value="number">Nombre</option>
                <option value="amount">Montant</option>
                <option value="percent">Pourcentage</option>
              </select>
              <input
                className="field text-sm sm:col-span-2"
                placeholder="Valeur par défaut"
                value={field.defaultValue}
                onChange={(event) => setFields((current) => current.map((item, i) => i === index ? { ...item, defaultValue: event.target.value } : item))}
              />
              <input
                className="field text-sm sm:col-span-2"
                placeholder="Aide affichée sous le champ (facultatif)"
                value={field.helperText}
                onChange={(event) => setFields((current) => current.map((item, i) => i === index ? { ...item, helperText: event.target.value } : item))}
              />
              <button
                type="button"
                onClick={() => setFields((current) => current.filter((_item, i) => i !== index))}
                className="btn-quiet text-xs font-bold text-red-700"
                disabled={fields.length <= 1}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>

        <label className="field-label">
          <span>Formule</span>
          <textarea
            className="field min-h-[90px] font-mono text-xs"
            value={formula}
            onChange={(event) => setFormula(event.target.value)}
            required
          />
        </label>

        <label className="field-label">
          <span>Raison générée (facultatif)</span>
          <input
            className="field"
            value={reasonTemplate}
            onChange={(event) => setReasonTemplate(event.target.value)}
            placeholder="Ex : Économie E85 — {litres} L"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="field-label">
            <span>Mouvement</span>
            <select className="field" value={resultMode} onChange={(event) => setResultMode(event.target.value as typeof resultMode)}>
              <option value="deposit">Dépôt</option>
              <option value="withdrawal">Retrait</option>
            </select>
          </label>
          <label className="field-label">
            <span>Résultat négatif</span>
            <select className="field" value={negativeMode} onChange={(event) => setNegativeMode(event.target.value as typeof negativeMode)}>
              <option value="clamp_to_zero">Ramener à 0</option>
              <option value="convert_to_opposite">Inverser dépôt/retrait</option>
            </select>
          </label>
          <label className="field-label">
            <span>Arrondi</span>
            <select className="field" value={roundingMode} onChange={(event) => setRoundingMode(event.target.value as typeof roundingMode)}>
              <option value="cents">Centimes</option>
              <option value="euro_floor">Euro inférieur</option>
              <option value="euro_ceil">Euro supérieur</option>
              <option value="euro_nearest">Euro le plus proche</option>
            </select>
          </label>
        </div>

        <div className="rounded-xl bg-black/[0.04] px-3 py-2 text-xs text-[var(--ink-700)]">
          Aperçu avec les valeurs par défaut :{" "}
          <strong>{preview == null ? "formule à vérifier" : formatCurrency(preview)}</strong>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="submit"
            disabled={save.isSubmitting || fieldsToPayload(fields).length === 0}
            className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold disabled:opacity-50"
          >
            <Save className="size-4" />
            {save.isSubmitting ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer"}
          </button>
          {editingId ? (
            <button
              type="button"
              disabled={deleteAction.isSubmitting}
              onClick={() => {
                if (!window.confirm("Supprimer ce calculateur ? Son historique sera supprimé.")) return;
                const fd = new FormData();
                fd.set("_action", "delete");
                deleteAction.submit(fd);
              }}
              className="btn-quiet inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              Supprimer
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
