"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyValueButtonProps = {
  label: string;
  value: string;
  className?: string;
};

export async function copyTextWithFallback(value: string) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fall through to the DOM fallback
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    const copied = document.execCommand("copy");

    if (!copied) {
      return false;
    }

    return true;
  } finally {
    document.body.removeChild(textarea);
  }
}

export function CopyValueButton({ label, value, className }: CopyValueButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const [showManualField] = useState(() => (typeof window === "undefined" ? false : !window.isSecureContext));

  return (
    <div className="compact-stack">
      <button
        className={className ?? "btn-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"}
        onClick={async () => {
          const copied = await copyTextWithFallback(value);

          if (copied) {
            setState("copied");
            window.setTimeout(() => setState("idle"), 1800);
            return;
          }

          setState("manual");
        }}
        type="button"
      >
        {state === "copied" ? <Check className="size-4" /> : <Copy className="size-4" />}
        {state === "copied" ? `${label} copiée` : state === "manual" ? "Copie manuelle" : label}
      </button>

      {showManualField || state === "manual" ? (
        <label className="field-label">
          <span className="field-help">
            {state === "manual" ? "Copiez ce contenu manuellement" : "Touchez le champ pour sélectionner l’adresse"}
          </span>
          <input
            className="field"
            onClick={(event) => event.currentTarget.select()}
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            type="text"
            value={value}
          />
        </label>
      ) : null}
    </div>
  );
}
