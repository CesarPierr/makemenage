"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyValueButtonProps = {
  label: string;
  value: string;
  className?: string;
};

export function CopyValueButton({ label, value, className }: CopyValueButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className={className ?? "btn-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm"}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
      type="button"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? `${label} copiée` : label}
    </button>
  );
}
