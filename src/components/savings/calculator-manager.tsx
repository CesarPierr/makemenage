"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, ChevronLeft, ChevronRight, Info, Plus, Save, Trash2, Wand2, X } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { BottomSheet } from "@/components/ui/bottom-sheet";
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
  isOpen: boolean;
  onClose: () => void;
  initialEditingId?: string | null;
  onSuccess?: () => void;
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

const tvaFields = (): DraftField[] => [
  { draftId: nextDraftFieldId(), key: "ca_brut", label: "CA Brut encaissé", type: "amount", defaultValue: "1000", helperText: "Montant total avec TVA", isRequired: true },
  { draftId: nextDraftFieldId(), key: "taux_tva", label: "Taux de TVA", type: "percent", defaultValue: "20", helperText: "En % (ex: 20)", isRequired: true },
];

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

export function CalculatorManager({ 
  householdId, 
  currentBoxId = null, 
  boxes,
  isOpen,
  onClose,
  initialEditingId = null,
  onSuccess,
}: CalculatorManagerProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(initialEditingId);
  
  const [name, setName] = useState("Mise de côté TVA");
  const [boxId, setBoxId] = useState<string>(currentBoxId ?? "");
  const [description, setDescription] = useState("Calcule la TVA à provisionner sur un encaissement.");
  const [formula, setFormula] = useState("ca_brut * taux_tva / (100 + taux_tva)");
  const [reasonTemplate, setReasonTemplate] = useState("Provision TVA sur {ca_brut} €");
  const [resultMode, setResultMode] = useState<"deposit" | "withdrawal" | "none">("deposit");
  const [negativeMode, setNegativeMode] = useState<"clamp_to_zero" | "convert_to_opposite">("clamp_to_zero");
  const [roundingMode, setRoundingMode] = useState<"cents" | "euro_floor" | "euro_ceil" | "euro_nearest">("cents");
  const [fields, setFields] = useState<DraftField[]>(() => tvaFields());

  useEffect(() => {
    if (isOpen) {
      if (initialEditingId) {
        fetch(`/api/households/${householdId}/savings/calculators/${initialEditingId}`, { headers: { "x-requested-with": "fetch" } })
          .then((res) => res.json())
          .then((data) => {
            if (data.calculator) {
              const calc = data.calculator;
              setEditingId(calc.id);
              setName(calc.name);
              setBoxId(calc.boxId ?? "");
              setDescription(calc.description ?? "");
              setFormula(calc.formula);
              setReasonTemplate(calc.reasonTemplate ?? "");
              setResultMode(calc.resultMode);
              setNegativeMode(calc.negativeMode);
              setRoundingMode(calc.roundingMode);
              setFields(calc.fields.map(fieldFromView));
              setStep(0);
            }
          });
      } else {
        resetWizard();
      }
    }
  }, [isOpen, initialEditingId, householdId]);

  const action = editingId
    ? `/api/households/${householdId}/savings/calculators/${editingId}`
    : `/api/households/${householdId}/savings/calculators`;

  const save = useFormAction({
    action,
    successMessage: editingId ? "Calculateur modifié." : "Calculateur créé.",
    errorMessage: "Impossible d'enregistrer ce calculateur.",
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const remove = useFormAction({
    action,
    successMessage: "Calculateur supprimé.",
    errorMessage: "Suppression impossible.",
    onSuccess: () => {
      onSuccess?.();
      onClose();
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

  function resetWizard(template: "tva" | "e85" | "empty" = "tva") {
    setStep(0);
    setEditingId(null);
    setBoxId(currentBoxId ?? "");
    setNegativeMode("clamp_to_zero");
    setRoundingMode("cents");

    if (template === "empty") {
      setName("Nouveau calculateur");
      setDescription("");
      setFormula("0");
      setReasonTemplate("");
      setResultMode("none");
      setFields([]);
      return;
    }

    if (template === "e85") {
      setName("Économie E85");
      setDescription("Calcule l'économie réalisée en roulant à l'éthanol.");
      setFields(e85Fields());
      setFormula("(litres * prix_sp95) - (litres * prix_e85 * (1 + surconsommation/100))");
      setReasonTemplate("Économie E85 ({litres}L)");
      setResultMode("deposit");
    } else {
      setName("Mise de côté TVA");
      setDescription("Calcule la TVA à provisionner sur un encaissement.");
      setFormula("ca_brut * taux_tva / (100 + taux_tva)");
      setReasonTemplate("Provision TVA sur {ca_brut} €");
      setResultMode("deposit");
      setFields(tvaFields());
    }
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

  function insertVariable(key: string) {
    setFormula((prev) => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed === "0") return key;
      // Always add a space before appending a new variable for safety
      return prev.endsWith(" ") ? prev + key : prev + " " + key;
    });
  }

  return (
    <>
      <Dialog isOpen={showHelp} onClose={() => setShowHelp(false)} title="Aide aux formules">
        <div className="space-y-4 text-sm">
          <p>Utilisez les <strong>clés variables</strong> de vos champs dans votre formule.</p>
          <div className="rounded-xl bg-black/[0.04] p-3">
            <p className="font-bold">Calcul de TVA (20%)</p>
            <code className="mt-1 block text-xs">ca_brut * 20 / 120</code>
          </div>
          <div className="rounded-xl bg-black/[0.04] p-3">
            <p className="font-bold">15% d&apos;une prime</p>
            <code className="mt-1 block text-xs">prime * 0.15</code>
          </div>
          <p className="text-xs text-[var(--ink-500)]">Opérateurs : +, -, *, /, parenthèses. Fonctions : min, max, round, ceil, floor, abs.</p>
        </div>
      </Dialog>

      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={editingId ? "Modifier le calculateur" : "Nouveau calculateur"}
        maxHeight={95}
      >
        <div className="space-y-5 pb-8">
          <div className="flex items-center gap-1.5 px-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", i <= step ? "bg-[var(--coral-500)]" : "bg-black/[0.08]")} />
            ))}
          </div>

          {step === 0 ? (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <label className="field-label">
                  <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Nom du calculateur</span>
                  <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: TVA 20%" required autoFocus />
                </label>
                <label className="field-label">
                  <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Enveloppe par défaut</span>
                  <select className="field" value={boxId} onChange={(e) => setBoxId(e.target.value)}>
                    <option value="">Aucune (choisir à chaque fois)</option>
                    {boxes.filter((b) => !b.isArchived).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
                <label className="field-label">
                  <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Description (facultatif)</span>
                  <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="À quoi sert-il ?" />
                </label>
              </div>

              {!editingId && (
                <div className="pt-4 border-t border-black/[0.05]">
                  <p className="text-[10px] uppercase font-bold text-[var(--ink-400)] mb-3 tracking-widest">Utiliser un modèle</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => resetWizard("tva")} className="app-surface flex flex-col items-center gap-2 p-3 rounded-xl border border-black/[0.04] text-center transition-all active:scale-95 hover:bg-black/[0.02]">
                      <span className="text-xs font-bold text-blue-600">Provision TVA</span>
                    </button>
                    <button type="button" onClick={() => resetWizard("e85")} className="app-surface flex flex-col items-center gap-2 p-3 rounded-xl border border-black/[0.04] text-center transition-all active:scale-95 hover:bg-black/[0.02]">
                      <span className="text-xs font-bold text-green-600">Économie E85</span>
                    </button>
                    <button type="button" onClick={() => resetWizard("empty")} className="col-span-2 app-surface flex items-center justify-center gap-2 p-2 rounded-xl border border-dashed border-black/10 text-center transition-all active:scale-95 hover:bg-black/[0.02]">
                      <Plus className="size-4 text-[var(--ink-400)]" />
                      <span className="text-xs font-bold text-[var(--ink-500)]">Template vide</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-500)]">Variables du formulaire</p>
                <button type="button" onClick={() => setFields((current) => [...current, blankField()])} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold">
                  <Plus className="size-3.5" /> Ajouter
                </button>
              </div>
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.draftId} className="app-surface rounded-2xl border border-black/[0.05] p-4 space-y-3 relative overflow-hidden">
                    <div className="grid gap-3 grid-cols-2">
                      <label className="field-label">
                        <span className="text-[10px] uppercase font-bold text-[var(--ink-400)]">ID Variable (clé)</span>
                        <input className="field text-sm font-mono" placeholder="ex: montant" value={field.key} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, key: e.target.value.replace(/[^a-z0-9_]/g, "") } : item))} required />
                      </label>
                      <label className="field-label">
                        <span className="text-[10px] uppercase font-bold text-[var(--ink-400)]">Type</span>
                        <select className="field text-sm" value={field.type} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, type: e.target.value as DraftField["type"] } : item))}>
                          <option value="number">Nombre</option>
                          <option value="amount">€ Montant</option>
                          <option value="percent">% Pourcentage</option>
                        </select>
                      </label>
                      <label className="field-label col-span-2">
                        <span className="text-[10px] uppercase font-bold text-[var(--ink-400)]">Libellé (Affiché à l&apos;utilisateur)</span>
                        <input className="field text-sm" placeholder="Ex: Prix au litre" value={field.label} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} required />
                      </label>
                    </div>
                    
                    <details className="text-[10px] font-bold text-[var(--ink-400)]">
                      <summary className="cursor-pointer hover:text-[var(--ink-600)] transition-colors">Plus d&apos;options...</summary>
                      <div className="pt-3 space-y-3">
                        <label className="field-label">
                          <span className="text-[10px] uppercase font-bold">Valeur par défaut</span>
                          <input className="field text-sm" value={field.defaultValue} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, defaultValue: e.target.value } : item))} />
                        </label>
                        <label className="field-label">
                          <span className="text-[10px] uppercase font-bold">Texte d&apos;aide</span>
                          <input className="field text-sm" value={field.helperText} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, helperText: e.target.value } : item))} />
                        </label>
                      </div>
                    </details>

                    <button type="button" onClick={() => setFields((current) => current.filter((_item, i) => i !== index))} className="absolute top-2 right-2 p-2 text-red-400 hover:text-red-600 transition-colors">
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-500)]">Variables disponibles</p>
                  <p className="text-[10px] text-[var(--ink-400)] italic">Insérer dans la formule</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {fields.filter(f => f.key.trim()).map((field) => (
                    <button
                      key={field.draftId}
                      type="button"
                      onClick={() => insertVariable(field.key)}
                      className="inline-flex items-center gap-1 rounded-md bg-black/[0.04] px-2 py-1 text-[10px] font-bold text-[var(--ink-600)] hover:bg-black/[0.08] transition-colors border border-black/[0.02]"
                    >
                      <Plus className="size-2.5 opacity-50" />
                      {field.key}
                    </button>
                  ))}
                  {fields.filter(f => f.key.trim()).length === 0 && (
                    <p className="text-[10px] text-[var(--ink-400)] py-1 px-1">Aucune variable définie.</p>
                  )}
                </div>
              </div>

              <div className="app-surface rounded-2xl bg-[var(--ink-900)] p-5 text-white shadow-xl">
                <label className="block mb-2 text-[10px] uppercase font-bold tracking-widest text-white/50">Formule mathématique</label>
                <textarea 
                  className="w-full bg-transparent border-none focus:ring-0 font-mono text-lg resize-none min-h-[100px]" 
                  value={formula} 
                  onChange={(e) => setFormula(e.target.value)} 
                  required 
                  spellCheck={false}
                  placeholder="ex: montant * 0.20"
                />
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-white/40">
                    <Info className="size-3" />
                    <span>Syntaxe : + - * / ( )</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold text-white/40">Résultat prévisionnel</span>
                    <span className={cn("text-xl font-bold tabular-nums", preview === null && formula.trim() && formula !== "0" ? "text-red-400" : "text-white")}>
                      {preview === null ? (formula.trim() && formula !== "0" ? "Formule invalide" : "—") : formatCurrency(preview)}
                    </span>
                  </div>
                </div>
              </div>

              <details className="group">
                <summary className="list-none cursor-pointer flex items-center gap-2 text-[10px] uppercase font-bold text-[var(--ink-400)] hover:text-[var(--ink-600)] transition-colors">
                  <Info className="size-3" />
                  <span>Aide à la syntaxe</span>
                  <ChevronRight className="size-3 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="mt-2 rounded-xl bg-black/[0.03] p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-medium text-[var(--ink-600)]">
                    <span>Addition : <code>+</code></span>
                    <span>Soustraction : <code>-</code></span>
                    <span>Multiplication : <code>*</code></span>
                    <span>Division : <code>/</code></span>
                    <span>Pourcentage : <code>* 0.20</code></span>
                    <span>TVA incluse : <code>/ 1.20</code></span>
                  </div>
                </div>
              </details>

              <label className="field-label">
                <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Modèle de raison (historique)</span>
                <input className="field" value={reasonTemplate} onChange={(e) => setReasonTemplate(e.target.value)} placeholder="Ex : Provision TVA sur {ca_brut} €" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {fields.filter(f => f.key.trim()).map(field => (
                    <button
                      key={field.draftId}
                      type="button"
                      onClick={() => setReasonTemplate(prev => prev + `{${field.key}}`)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/[0.05] text-[var(--ink-600)] hover:bg-black/[0.1] transition-colors"
                    >
                      {"{"}{field.key}{"}"}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-[var(--ink-400)] leading-relaxed italic">Insérer dans le modèle de raison.</p>
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="field-label">
                  <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Type de mouvement</span>
                  <select className="field" value={resultMode} onChange={(e) => setResultMode(e.target.value as typeof resultMode)}>
                    <option value="deposit">Dépôt (Ajoute de l&apos;argent)</option>
                    <option value="withdrawal">Retrait (Sort de l&apos;argent)</option>
                    <option value="none">Aide uniquement (Pas de mouvement)</option>
                  </select>
                </label>
                <label className="field-label">
                  <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Arrondi</span>
                  <select className="field" value={roundingMode} onChange={(e) => setRoundingMode(e.target.value as typeof roundingMode)}>
                    <option value="cents">Au centime près</option>
                    <option value="euro_floor">Euro inférieur</option>
                    <option value="euro_ceil">Euro supérieur</option>
                    <option value="euro_nearest">Euro le plus proche</option>
                  </select>
                </label>
                <label className="field-label sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-[var(--ink-500)]">Si le résultat est négatif</span>
                  <select className="field" value={negativeMode} onChange={(e) => setNegativeMode(e.target.value as typeof negativeMode)}>
                    <option value="clamp_to_zero">Ne rien faire (0 €)</option>
                    <option value="convert_to_opposite">Inverser (Dépôt ↔ Retrait)</option>
                  </select>
                </label>
              </div>

              <div className="app-surface rounded-2xl border-2 border-dashed border-black/[0.05] p-5 text-center">
                <p className="text-[10px] uppercase font-bold text-[var(--ink-400)] mb-1">Résumé</p>
                <p className="font-bold text-[var(--ink-900)]">{name}</p>
                <p className="text-xs text-[var(--ink-500)] mt-1">{fieldsToPayload(fields).length} variable(s) · {resultMode === "deposit" ? "Dépôt" : "Retrait"}</p>
              </div>
              
              {editingId && (
                <button type="button" onClick={() => { if (!window.confirm("Supprimer ce calculateur ?")) return; const fd = new FormData(); fd.set("_action", "delete"); remove.submit(fd); }} className="btn-quiet w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-xl">
                  <Trash2 className="size-4" /> Supprimer définitivement
                </button>
              )}
            </div>
          ) : null}

          <div className="flex gap-3 pt-4 border-t border-black/[0.05]">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary flex-1 inline-flex items-center justify-center gap-2 py-3 text-sm font-bold">
                <ChevronLeft className="size-4" /> Retour
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!name.trim()} className="btn-primary flex-[2] inline-flex items-center justify-center gap-2 py-3 text-sm font-bold shadow-lg disabled:opacity-50">
                Suivant <ChevronRight className="size-4" />
              </button>
            ) : (
              <button type="button" onClick={submitWizard} disabled={save.isSubmitting || !name.trim()} className="btn-primary flex-[2] inline-flex items-center justify-center gap-2 py-3 text-sm font-bold shadow-lg disabled:opacity-50">
                {save.isSubmitting ? "Enregistrement..." : "Enregistrer"}
              </button>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
