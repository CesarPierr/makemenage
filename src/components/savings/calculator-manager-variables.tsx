"use client";

import { Plus, X } from "lucide-react";
import type { DraftField } from "./calculator-manager-types";

type CalculatorManagerVariablesProps = {
  fields: DraftField[];
  setFields: React.Dispatch<React.SetStateAction<DraftField[]>>;
  blankField: () => DraftField;
};

export function CalculatorManagerVariables({
  fields,
  setFields,
  blankField,
}: CalculatorManagerVariablesProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase font-bold tracking-widest text-ink-500">Variables du formulaire</p>
        <button type="button" onClick={() => setFields((current) => [...current, blankField()])} className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold">
          <Plus className="size-3.5" /> Ajouter
        </button>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.draftId} className="app-surface rounded-2xl border border-black/[0.05] p-4 space-y-3 relative overflow-hidden">
            <div className="grid gap-3 grid-cols-2">
              <label className="field-label">
                <span className="text-[10px] uppercase font-bold text-ink-400">ID Variable (clé)</span>
                <input className="field text-sm font-mono" placeholder="ex: montant" value={field.key} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, key: e.target.value.replace(/[^a-z0-9_]/g, "") } : item))} required />
              </label>
              <label className="field-label">
                <span className="text-[10px] uppercase font-bold text-ink-400">Type</span>
                <select className="field text-sm" value={field.type} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, type: e.target.value as DraftField["type"] } : item))}>
                  <option value="number">Nombre</option>
                  <option value="amount">€ Montant</option>
                  <option value="percent">% Pourcentage</option>
                </select>
              </label>
              <label className="field-label col-span-2">
                <span className="text-[10px] uppercase font-bold text-ink-400">Libellé (Affiché à l&apos;utilisateur)</span>
                <input className="field text-sm" placeholder="Ex: Prix au litre" value={field.label} onChange={(e) => setFields((current) => current.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} required />
              </label>
            </div>
            
            <details className="text-[10px] font-bold text-ink-400">
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
  );
}
