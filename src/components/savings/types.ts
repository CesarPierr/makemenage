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

export type SavingsCalculatorFieldView = {
  id: string;
  calculatorId: string;
  key: string;
  label: string;
  type: "number" | "amount" | "percent";
  defaultValue: string | null;
  helperText: string | null;
  isRequired: boolean;
  sortOrder: number;
};

export type SavingsCalculatorView = {
  id: string;
  householdId: string;
  boxId: string;
  name: string;
  description: string | null;
  formula: string;
  reasonTemplate: string | null;
  resultMode: "deposit" | "withdrawal";
  negativeMode: "clamp_to_zero" | "convert_to_opposite";
  roundingMode: "cents" | "euro_floor" | "euro_ceil" | "euro_nearest";
  isArchived: boolean;
  sortOrder: number;
  fields: SavingsCalculatorFieldView[];
};
