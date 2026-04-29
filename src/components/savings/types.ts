import type { SavingsBoxKind, SavingsEntryType } from "@prisma/client";

export type SavingsAutoFillView = {
  id: string;
  amount: string;
  type: "daily" | "every_x_days" | "weekly" | "every_x_weeks" | "monthly_simple";
  interval: number;
  weekdays: number[] | null;
  dayOfMonth: number | null;
  anchorDate: string;
  startsOn: string;
  endsOn: string | null;
  isPaused: boolean;
  lastAppliedOn: string | null;
};

export type SavingsBoxView = {
  id: string;
  householdId: string;
  name: string;
  kind: SavingsBoxKind;
  icon: string | null;
  color: string;
  targetAmount: string | null;
  targetDate: string | null;
  allowNegative: boolean;
  isArchived: boolean;
  sortOrder: number;
  notes: string | null;
  balance: number;
  autoFillRule: SavingsAutoFillView | null;
};

export type SavingsEntryView = {
  id: string;
  boxId: string;
  type: SavingsEntryType;
  amount: string;
  occurredOn: string;
  reason: string | null;
  authorMemberId: string | null;
  transferId: string | null;
  autoFillRuleId: string | null;
  createdAt: string;
};
