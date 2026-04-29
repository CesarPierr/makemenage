import type { Decimal } from "@prisma/client/runtime/library";

const FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SIGNED_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

type Numeric = Decimal | number | string | null | undefined;

export function toNumber(value: Numeric): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  // Prisma Decimal
  return Number.parseFloat(value.toString());
}

export function formatCurrency(value: Numeric) {
  return FORMATTER.format(toNumber(value));
}

export function formatSignedCurrency(value: Numeric) {
  return SIGNED_FORMATTER.format(toNumber(value));
}

/**
 * Parse a user-entered amount in fr-FR conventions: accepts "1 234,56", "1234.56",
 * "12,5", "12". Returns null if invalid or non-finite.
 */
export function parseAmount(input: string): number | null {
  if (typeof input !== "string") return null;
  const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  // Round to 2 decimals to dodge float drift
  return Math.round(n * 100) / 100;
}

export function isValidAmount(value: number) {
  return Number.isFinite(value) && Math.abs(value) < 1_000_000_000_000; // < 1e12, fits Decimal(12,2)
}
