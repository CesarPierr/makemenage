"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  type?: "danger" | "default";
}

export function Dialog({ isOpen, onClose, title, children, footer, type = "default" }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
        document.body.style.overflow = "hidden";
      }
    } else {
      if (dialog.open) {
        dialog.close();
        document.body.style.overflow = "";
      }
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle click outside to close — use the proper pattern
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    const handleClick = (e: MouseEvent) => {
      // When clicking the backdrop, e.target is the dialog element itself
      if (e.target === dialog) {
        onClose();
      }
    };

    dialog.addEventListener("click", handleClick);
    return () => dialog.removeEventListener("click", handleClick);
  }, [isOpen, onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto rounded-3xl p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 w-[calc(100%-1.5rem)] max-w-md shadow-2xl max-h-[85vh] overflow-hidden"
    >
      <div className={`overflow-y-auto max-h-[85vh] p-5 sm:p-8 ${type === "danger" ? "border-t-4 border-red-500" : ""}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h3>
          <button
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[var(--ink-700)] transition-colors hover:bg-black/10 active:scale-90"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="text-gray-700">{children}</div>
        {footer && <div className="mt-8 flex justify-end gap-3">{footer}</div>}
      </div>
    </dialog>
  );
}
