"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, ChevronLeft, ChevronRight, Info, Plus, Save, Trash2, Wand2, X } from "lucide-react";

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
  currentBoxId?: string | null;
  boxes: SavingsBoxView[];
};

let draftFieldCounter = 0;
const nextDraftFieldId = () => `field-${++draftFieldCounter}`;

const blankField = (): DraftField => ({
  draftId: nextDraftFieldId(),
  key: "",
  label: "",
  type: "number",
  defaultValue: "",
  helperText: "",
  isRequired: true,
});

const e85Fields = (): DraftField[] => [
  { draftId: nextDraftFieldId(), key: "prix_e85", label: "Prix E85", type: "amount", defaultValue: "0,85", helperText: "Prix payé au litre", isRequired: true },
  { draftId: nextDraftFieldId(), key: "litres", label: "Litres", type: "number", defaultValue: "40", helperText: "Quantité mise à la pompe", isRequired: true },
  { draftId: nextDraftFieldId(), key: "prix_sp95", label: "Prix SP95 de référence", type: "amount", defaultValue: "1,85", helperText: "Prix de comparaison", isRequired: true },
  { draftId: nextDraftFieldId(), key: "surconsommation", label: "Surconsommation E85", type: "percent", defaultValue: "20", helperText: "Ex : 20 pour 20%", isRequired: true },
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

export function CalculatorManager({ householdId, currentBoxId = null, boxes }: CalculatorManagerProps) {
  const [calculators, setCalculators] = useState<SavingsCalculatorView[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("Économie E85");
  const [boxId, setBoxId] = useState<string>(currentBoxId ?? "");
  const [description, setDescription] = useState("");
  const [formula, setFormula] = useState("(litres * prix_sp95) - (litres * prix_e85 * (1 + surconsommation / 100))");
  const [reasonTemplate, setReasonTemplate] = useState("Économie E85 — {litres} L à {prix_e85} €/L");
  const [resultMode, setResultMode] = useState<"deposit" | "withdrawal">("deposit");
  const [negativeMode, setNegativeMode] = useState<"clamp_to_zero" | "convert_to_opposite">("clamp_to_zero");
  const [roundingMode, setRoundingMode] = useState<"cents" | "euro_floor" | "euro_ceil" | "euro_nearest">("cents");
  const [fields, setFields] = useState<DraftField[]>(() => e85Fields());

  function loadCalculators() {
    const suffix = currentBoxId ? `?boxId=${currentBoxId}&archived=1` : "?archived=1";
    fetch(`/api/households/${householdId}/savings/calculators${suffix}`, { headers: { "x-requested-with": "fetch" } })
      .then((res) => res.json())
      .then((data) => setCalculators(data.calculators ?? []))
      .catch(() => setCalculators([]));
  }

  useEffect(() => {
    let cancelled = false;
    const suffix = currentBoxId ? `?boxId=${currentBoxId}&archived=1` : "?archived=1";
    fetch(`/api/households/${householdId}/savings/calculators${suffix}`, { headers: { "x-requested-with": "fetch" } })
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setCalculators(data.calculators ?? []); })
      .catch(() => { if (!cancelled) setCalculators([]); });
    return () => { cancelled = true; };
  }, [householdId, currentBoxId]);

  const action = editingId
    ? `/api/households/${householdId}/savings/calculators/${editingId}`
    : `/api/households/${householdId}/savings/calculators`;

  const save = useFormAction({
    action,
    successMessage: editingId ? "Calculateur modifié." : "Calculateur créé.",
    errorMessage: "Impossible d'enregistrer ce calculateur.",
    onSuccess: () => {
      loadCalculators();
      setWizardOpen(false);
    },
  });

  const remove = useFormAction({
    action,
    successMessage: "Calculateur supprimé.",
    errorMessage: "Suppression impossible.",
    onSuccess: () => {
      resetWizard();
      loadCalculators();
    },
  });

  const preview = useMemo(() => {
    const values = Object.fromEntries(fieldsToPayload(fields).map((field) => [field.key, parseDefault(field.defaultValue)]));
    try {
      return Math.round(evaluateFormula(formula, values) * 100) / 100;
    } catch {
      return null;
    }
  }, [fields, formula]);

  function resetWizard() {
    setStep(0);
    setEditingId(null);
    setName("Économie E85");
    setBoxId(currentBoxId ?? "");
    setDescription("");
    setFormula("(litres * prix_sp95) - (litres * prix_e85 * (1 + surconsommation / 100))");
    setReasonTemplate("Économie E85 — {litres} L à {prix_e85} €/L");
    setResultMode("deposit");
    setNegativeMode("clamp_to_zero");
    setRoundingMode("cents");
    setFields(e85Fields());
  }

  function editCalculator(calculator: SavingsCalculatorView) {
    setEditingId(calculator.id);
    setName(calculator.name);
    setBoxId(calculator.boxId ?? "");
    setDescription(calculator.description ?? "");
    setFormula(calculator.formula);
    setReasonTemplate(calculator.reasonTemplate ?? "");
    setResultMode(calculator.resultMode);
    setNegativeMode(calculator.negativeMode);
    setRoundingMode(calculator.roundingMode);
    setFields(calculator.fields.map(fieldFromView));
    setStep(0);
    setWizardOpen(true);
  }

  function submitWizard() {
    const fd = new FormData();
    fd.set("boxId", boxId);
    fd.set("name", name);
    fd.set("description", description);
    fd.set("formula", formula);
    fd.set("reasonTemplate", reasonTemplate);
    fd.set("resultMode", resultMode);
    fd.set("negativeMode", negativeMode);
    fd.set("roundingMode", roundingMode);
    fd.set("fields", JSON.stringify(fieldsToPayload(fields)));
    save.submit(fd);
  }

  return (
    <div className="space-y-4">
      <Dialog isOpen={showHelp} onClose={() => setShowHelp(false)} title="Exemples de calculateurs">
        <div className="space-y-4 text-sm">
          <p>Un calculateur est un formulaire qui applique une formule, puis crée un dépôt ou un retrait dans l&apos;enveloppe choisie au moment de l&apos;utilisation.</p>
          <div className="rounded-xl bg-black/[0.04] p-3">
            <p className="font-bold">Économie E85</p>
            <code className="mt-1 block text-xs">(litres * prix_sp95) - (litres * prix_e85 * (1 + surconsommation / 100))</code>
          </div>
          <div className="rounded-xl bg-black/[0.04] p-3">
            <p className="font-bold">Mettre 15% d&apos;une prime de côté</p>
            <code className="mt-1 block text-xs">prime * 15 / 100</code>
          </div>
          <p className="text-xs text-[var(--ink-500)]">Opérateurs : +, -, *, /, parenthèses. Fonctions : min, max, round, ceil, floor, abs. Dans la formule, utilisez le point pour les décimales.</p>
        </div>
      </Dialog>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-[var(--ink-900)]">Calculateurs personnalisés</h4>
          <p className="text-xs text-[var(--ink-500)]">Globaux, ou liés par défaut à une enveloppe.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowHelp(true)} className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs font-bold">
            <Info className="size-4" /> Aide
          </button>
          <button type="button" onClick={() => { resetWizard(); setWizardOpen(true); }} className="btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs font-bold">
            <Plus className="size-4" /> Nouveau
          </button>
        </div>
      </div>

      {calculators.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {calculators.map((calculator) => (
            <button key={calculator.id} type="button" onClick={() => editCalculator(calculator)} className="rounded-xl border border-black/[0.06] bg-black/[0.02] px-3 py-2 text-left hover:bg-black/[0.04]">
              <span className="block text-sm font-bold">{calculator.name}</span>
              <span className="block truncate text-xs text-[var(--ink-500)]">{calculator.boxId ? "Cible proposée" : "Global"} · {calculator.formula}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-5 text-center">
          <Calculator className="mx-auto size-6 text-[var(--coral-500)]" />
          <p className="mt-2 text-sm font-bold">Aucun calculateur</p>
          <p className="text-xs text-[var(--ink-500)]">Créez une règle E85, prime, remboursement ou autre.</p>
        </div>
      )}

      {wizardOpen ? (
        <div className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-[var(--coral-500)]" : "bg-black/[0.08]")} />
              ))}
            </div>
            <button type="button" onClick={() => setWizardOpen(false)} className="btn-quiet p-1">
              <X className="size-4" />
            </button>
          </div>

          {step === 0 ? (
            <div className="space-y-3">
              <label className="field-label"><span>Nom</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} required /></label>
              <label className="field-label"><span>Enveloppe proposée (facultatif)</span><select className="field" value={boxId} onChange={(e) => setBoxId(e.target.value)}><option value="">Aucune, choisir au moment du calcul</option>{boxes.filter((b) => !b.isArchived).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
              <label className="field-label"><span>Description</span><input className="field" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
              <button type="button" onClick={() => { setName("Économie E85"); setDescription("Calcule l'économie réalisée par rapport à un plein SP95."); setFields(e85Fields()); setFormula("(litres * prix_sp95) - (litres * prix_e85 * (1 + surconsommation / 100))"); setReasonTemplate("Économie E85 — {litres} L à {prix_e85} €/L"); }} className="btn-secondary inline-flex w-full items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold"><Wand2 className="size-4" /> Charger le modèle E85</button>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-500)]">Champs</p><button type="button" onClick={() => setFields((current) => [...current, blankField()])} className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-xs font-bold"><Plus className="size-3.5" /> Champ</button></div>
              {fields.map((field, index) => (
                <div key={field.draftId} className="grid gap-2 rounded-xl bg-black/[0.025] p-3 sm:grid-cols-[1fr_1fr_120px]">
                  <input className="field text-sm" placeholder="clé_variable" value={field.key} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, key: e.target.value } : item))} required />
                  <input className="field text-sm" placeholder="Libellé" value={field.label} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} required />
                  <select className="field text-sm" value={field.type} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, type: e.target.value as DraftField["type"] } : item))}><option value="number">Nombre</option><option value="amount">Montant</option><option value="percent">Pourcentage</option></select>
                  <input className="field text-sm" placeholder="Valeur par défaut" value={field.defaultValue} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, defaultValue: e.target.value } : item))} />
                  <input className="field text-sm sm:col-span-2" placeholder="Aide affichée sous le champ" value={field.helperText} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, helperText: e.target.value } : item))} />
                  <button type="button" onClick={() => setFields((current) => current.filter((_item, i) => i !== index))} className="btn-quiet text-xs font-bold text-red-700" disabled={fields.length <= 1}>Retirer</button>
                </div>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <label className="field-label"><span>Formule</span><textarea className="field min-h-[110px] font-mono text-xs" value={formula} onChange={(e) => setFormula(e.target.value)} required /></label>
              <label className="field-label"><span>Raison générée</span><input className="field" value={reasonTemplate} onChange={(e) => setReasonTemplate(e.target.value)} placeholder="Ex : Économie E85 — {litres} L" /></label>
              <div className="rounded-xl bg-black/[0.04] px-3 py-2 text-xs text-[var(--ink-700)]">Aperçu avec les valeurs par défaut : <strong>{preview == null ? "formule à vérifier" : formatCurrency(preview)}</strong></div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="field-label"><span>Mouvement</span><select className="field" value={resultMode} onChange={(e) => setResultMode(e.target.value as typeof resultMode)}><option value="deposit">Dépôt</option><option value="withdrawal">Retrait</option></select></label>
                <label className="field-label"><span>Résultat négatif</span><select className="field" value={negativeMode} onChange={(e) => setNegativeMode(e.target.value as typeof negativeMode)}><option value="clamp_to_zero">Ramener à 0</option><option value="convert_to_opposite">Inverser dépôt/retrait</option></select></label>
                <label className="field-label"><span>Arrondi</span><select className="field" value={roundingMode} onChange={(e) => setRoundingMode(e.target.value as typeof roundingMode)}><option value="cents">Centimes</option><option value="euro_floor">Euro inférieur</option><option value="euro_ceil">Euro supérieur</option><option value="euro_nearest">Euro proche</option></select></label>
              </div>
              <div className="rounded-xl bg-black/[0.04] p-3 text-sm"><p className="font-bold">{name}</p><p className="mt-1 text-xs text-[var(--ink-500)]">{boxId ? "Enveloppe proposée définie" : "Calculateur global"} · {fieldsToPayload(fields).length} champ(s)</p></div>
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            {step > 0 ? <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary inline-flex items-center gap-1 px-3 py-2 text-sm font-bold"><ChevronLeft className="size-4" /> Retour</button> : null}
            {step < 3 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!name.trim() || fieldsToPayload(fields).length === 0} className="btn-primary ml-auto inline-flex items-center gap-1 px-4 py-2 text-sm font-bold disabled:opacity-50">Suivant <ChevronRight className="size-4" /></button>
            ) : (
              <button type="button" onClick={submitWizard} disabled={save.isSubmitting || !name.trim() || fieldsToPayload(fields).length === 0} className="btn-primary ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-bold disabled:opacity-50"><Save className="size-4" /> {save.isSubmitting ? "Enregistrement…" : "Enregistrer"}</button>
            )}
            {editingId ? <button type="button" onClick={() => { if (!window.confirm("Supprimer ce calculateur ?")) return; const fd = new FormData(); fd.set("_action", "delete"); remove.submit(fd); }} className="btn-quiet inline-flex items-center gap-1 px-3 py-2 text-sm font-bold text-red-700"><Trash2 className="size-4" /> Supprimer</button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
