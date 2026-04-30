import { render } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { ReactElement } from "react";
import { vi } from "vitest";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useFormAction globally for UI tests
vi.mock("@/lib/use-form-action", () => ({
  useFormAction: vi.fn().mockReturnValue({
    isSubmitting: false,
    submit: vi.fn().mockResolvedValue(true),
    handleSubmit: vi.fn(async (e) => {
      e.preventDefault();
    }),
  }),
}));

export function renderWithProviders(ui: ReactElement) {
  return render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>
  );
}

export * from "@testing-library/react";
export { renderWithProviders as render };
