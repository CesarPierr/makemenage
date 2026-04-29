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

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateInput() {
  return formatDateInput(new Date());
}
