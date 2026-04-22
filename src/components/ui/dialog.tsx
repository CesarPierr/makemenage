"use client";

import { useEffect, useRef, type ReactNode } from "react";

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
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e: MouseEvent) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;

      if (!isInDialog) {
        onClose();
      }
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto rounded-3xl p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 max-w-md w-full shadow-2xl"
    >
      <div className={`p-6 sm:p-8 ${type === "danger" ? "border-t-4 border-red-500" : ""}`}>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
        <div className="text-gray-700">{children}</div>
        {footer && <div className="mt-8 flex justify-end gap-3">{footer}</div>}
      </div>
    </dialog>
  );
}
