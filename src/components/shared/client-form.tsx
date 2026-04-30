"use client";

import { useFormAction } from "@/lib/use-form-action";

type ClientFormProps = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "method"> & {
  action: string;
  method?: "POST" | "PUT" | "DELETE";
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  refreshOnSuccess?: boolean;
};

export function ClientForm({
  action,
  method = "POST",
  successMessage,
  errorMessage,
  onSuccess,
  refreshOnSuccess = true,
  children,
  className,
  ...props
}: ClientFormProps) {
  const { handleSubmit, isSubmitting } = useFormAction({
    action,
    method,
    successMessage,
    errorMessage,
    onSuccess,
    refreshOnSuccess,
  });

  return (
    <form onSubmit={handleSubmit} className={className} {...props}>
      <fieldset disabled={isSubmitting} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
