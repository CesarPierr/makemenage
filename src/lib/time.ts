import { addDays, endOfDay, format, isBefore, startOfDay } from "date-fns";

export function getGenerationWindow() {
  const past = Number(process.env.OCCURRENCE_PAST_DAYS ?? 30);
  const future = Number(process.env.OCCURRENCE_FUTURE_DAYS ?? 60);
  const today = new Date();

  return {
    start: startOfDay(addDays(today, -past)),
    end: endOfDay(addDays(today, future)),
  };
}

export function isoDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function isPastDay(date: Date) {
  return isBefore(endOfDay(date), new Date());
}

export function isToday(date: Date) {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export function isFutureDay(date: Date) {
  return isBefore(new Date(), startOfDay(date));
}
