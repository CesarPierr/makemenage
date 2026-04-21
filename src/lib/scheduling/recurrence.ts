import {
  addDays,
  addWeeks,
  endOfDay,
  getDate,
  getDay,
  isAfter,
  isBefore,
  isEqual,
  setDate,
  startOfDay,
} from "date-fns";

import type { RecurrenceRuleInput } from "@/lib/scheduling/types";

function normalize(date: Date) {
  return startOfDay(date);
}

function sameDay(left: Date, right: Date) {
  return isEqual(normalize(left), normalize(right));
}

export function describeRecurrence(rule: RecurrenceRuleInput) {
  switch (rule.type) {
    case "daily":
      return "Tous les jours";
    case "every_x_days":
      return `Tous les ${rule.interval} jours`;
    case "weekly":
      return rule.weekdays?.length
        ? `Chaque semaine, jours ${rule.weekdays.join(", ")}`
        : "Chaque semaine";
    case "every_x_weeks":
      return `Toutes les ${rule.interval} semaines`;
    case "monthly_simple":
      return `Chaque mois le ${rule.dayOfMonth ?? getDate(rule.anchorDate)}`;
  }
}

export function generateRecurrenceDates(rule: RecurrenceRuleInput, rangeStart: Date, rangeEnd: Date) {
  const anchor = normalize(rule.anchorDate);
  const start = normalize(rangeStart);
  const end = normalize(rangeEnd);
  const dates: Date[] = [];

  if (isAfter(start, end)) {
    return dates;
  }

  if (rule.type === "daily" || rule.type === "every_x_days") {
    const interval = Math.max(1, rule.interval || 1);
    let cursor = anchor;

    while (isBefore(cursor, start)) {
      cursor = addDays(cursor, interval);
    }

    while (!isAfter(cursor, end)) {
      dates.push(cursor);
      cursor = addDays(cursor, interval);
    }

    return dates;
  }

  if (rule.type === "weekly") {
    const weekdays = (rule.weekdays?.length ? rule.weekdays : [getDay(anchor)]).sort();
    let cursor = start;

    while (!isAfter(cursor, end)) {
      if (!isBefore(cursor, anchor) && weekdays.includes(getDay(cursor))) {
        dates.push(cursor);
      }

      cursor = addDays(cursor, 1);
    }

    return dates;
  }

  if (rule.type === "every_x_weeks") {
    const weekday = getDay(anchor);
    const interval = Math.max(1, rule.interval || 1);
    let cursor = anchor;

    while (isBefore(cursor, start)) {
      cursor = addWeeks(cursor, interval);
    }

    while (!isAfter(cursor, end)) {
      if (getDay(cursor) === weekday) {
        dates.push(cursor);
      }
      cursor = addWeeks(cursor, interval);
    }

    return dates;
  }

  const interval = Math.max(1, rule.interval || 1);
  const targetDay = rule.dayOfMonth ?? getDate(anchor);
  let cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);

  while (isBefore(endOfDay(cursor), start)) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + interval, 1);
  }

  while (!isAfter(cursor, end)) {
    const candidate = setDate(new Date(cursor), Math.min(targetDay, new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()));

    if (!isBefore(candidate, anchor) && !isBefore(candidate, start) && !isAfter(candidate, end)) {
      dates.push(startOfDay(candidate));
    }

    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + interval, 1);
  }

  return dates;
}

export function computeDueDate(scheduledDate: Date, offsetDays = 0) {
  return endOfDay(addDays(startOfDay(scheduledDate), offsetDays));
}

export function buildGenerationKey(taskTemplateId: string, date: Date) {
  return `${taskTemplateId}:${date.toISOString().slice(0, 10)}`;
}

export function isLogicalOccurrenceDate(rule: RecurrenceRuleInput, date: Date) {
  return generateRecurrenceDates(rule, date, date).some((candidate) => sameDay(candidate, date));
}
