export function parseDateInput(value: string | Date | null | undefined) {
  if (value instanceof Date) {
    return value;
  }

  if (!value) {
    return new Date(Number.NaN);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  }

  return new Date(value);
}
