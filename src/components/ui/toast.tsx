"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 4000;

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const toastStyles = {
  success: "border-[rgba(56,115,93,0.25)] bg-[rgba(56,115,93,0.12)] text-leaf-600",
  error: "border-[rgba(216,100,61,0.25)] bg-[rgba(216,100,61,0.12)] text-coral-600",
  info: "border-[rgba(47,109,136,0.25)] bg-[rgba(47,109,136,0.12)] text-sky-600",
} as const;

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `toast-${++toastCounter}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);

      setTimeout(() => removeToast(id), TOAST_DURATION);
    },
    [removeToast],
  );

  const contextValue: ToastContextValue = {
    toast: addToast,
    success: useCallback((message: string) => addToast(message, "success"), [addToast]),
    error: useCallback((message: string) => addToast(message, "error"), [addToast]),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-20 left-3 right-3 z-50 flex flex-col items-center gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end lg:bottom-6"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {toasts.map((t) => {
          const Icon = toastIcons[t.type];

          return (
            <div
              key={t.id}
              className={cn(
                "flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md animate-toast-in",
                toastStyles[t.type],
              )}
            >
              <Icon className="size-5 shrink-0" />
              <p className="flex-1 text-sm font-semibold">{t.message}</p>
              <button
                className="shrink-0 rounded-full p-1 opacity-60 transition-opacity hover:opacity-100"
                onClick={() => removeToast(t.id)}
                type="button"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return context;
}
