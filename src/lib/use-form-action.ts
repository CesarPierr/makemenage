"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useToast } from "@/components/ui/toast";

interface UseFormActionOptions {
  /** URL to submit to */
  action: string;
  /** HTTP method (default POST) */
  method?: "POST" | "PUT" | "DELETE";
  /** Toast message on success */
  successMessage?: string;
  /** Toast message on error */
  errorMessage?: string;
  /** Callback after successful submission */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether to call router.refresh() after success (default true) */
  refreshOnSuccess?: boolean;
}

interface UseFormActionReturn {
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
  /** Submit handler for <form onSubmit> */
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  /** Direct submit with a FormData or plain object */
  submit: (data?: FormData | Record<string, string>) => Promise<boolean>;
}

export function useFormAction({
  action,
  method = "POST",
  successMessage = "Enregistré.",
  errorMessage = "Une erreur est survenue.",
  onSuccess,
  onError,
  refreshOnSuccess = true,
}: UseFormActionOptions): UseFormActionReturn {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (data?: FormData | Record<string, string>): Promise<boolean> => {
      if (isSubmitting) return false;

      setIsSubmitting(true);

      try {
        const body =
          data instanceof FormData
            ? data
            : data
              ? new URLSearchParams(data)
              : undefined;

        const headers: Record<string, string> = {};
        if (!(data instanceof FormData)) {
          headers["content-type"] = "application/x-www-form-urlencoded";
        }
        const csrfMatch = document.cookie.match(/(?:^|;\s*)__csrf=([^;]+)/);
        if (csrfMatch?.[1]) headers["x-csrf-token"] = csrfMatch[1];

        const response = await fetch(action, {
          method,
          body,
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(errorText || `HTTP ${response.status}`);
        }

        if (response.redirected) {
          if (successMessage) success(successMessage);
          router.push(response.url);
          onSuccess?.();
          return true;
        }

        if (successMessage) success(successMessage);
        if (refreshOnSuccess) router.refresh();
        onSuccess?.();
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (errorMessage) showError(errorMessage);
        onError?.(error);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [action, method, isSubmitting, successMessage, errorMessage, onSuccess, onError, refreshOnSuccess, router, success, showError],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isSubmitting) return;

      const formData = new FormData(e.currentTarget);
      await submit(formData);
    },
    [isSubmitting, submit],
  );

  return { isSubmitting, handleSubmit, submit };
}
